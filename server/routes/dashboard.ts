import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'

export const router = Router()

router.get('/metrics', auth(false), requireModule('dashboard'), async (req, res) => {
  try {
    const { filter, sdrId, closerId } = req.query;
    
    // 1. Isolamento Multi-Tenant (SaaS)
    const companyId = req.user?.companyId;
    let professionalIds: number[] = [];

    if (companyId) {
      const professionalsInCompany = await prisma.professional.findMany({
        where: { companyId },
        select: { id: true }
      });
      professionalIds = professionalsInCompany.map(p => p.id);
      
      const empresa = await prisma.empresa.findUnique({
        where: { id: companyId },
        select: { ownerId: true }
      });
      if (empresa?.ownerId && !professionalIds.includes(empresa.ownerId)) {
        professionalIds.push(empresa.ownerId);
      }
    } else {
      // Fallback para quando o token não tem companyId (ex: Administrador ou profissional autônomo)
      professionalIds = [req.user!.id];
    }

    // 2. Configuração do Range de Datas
    let startDate = new Date();
    let endDate = new Date();
    
    if (filter === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      endDate.setDate(endDate.getDate() + 1);
      // Adiciona 1 dia para evitar problemas com fuso horário (banco em UTC vs servidor)
      endDate.setDate(endDate.getDate() + 1);
    } else if (filter === '7days') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      endDate.setDate(endDate.getDate() + 1);
    } else if (filter === '30days') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      endDate.setDate(endDate.getDate() + 1);
    } else if (filter === 'custom' && req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate as string);
      endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      // Custom / Mês Atual (fallback)
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }
    
    // Condições Base Isoladas por Tenant e Data
    const baseWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      professionalId: { in: professionalIds }
    };
    if (companyId) baseWhere.companyId = companyId;

    const appointmentWhere: any = {
      startTime: { gte: startDate, lte: endDate },
      professionalId: { in: professionalIds }
    };
    if (companyId) appointmentWhere.companyId = companyId;

    // 2.5 Lógica de Filtros por SDR e Closer
    const leadExtraFilters: any = {};
    const paymentExtraFilters: any = {};

    // Regra de Visibilidade de Leads
    if (req.user?.type === 'usuario') {
      const dbUser = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        include: { role: true }
      });
      if (dbUser?.role && !dbUser.role.isAdmin && !dbUser.role.isManager) {
        // Se não for Admin nem Gestor Comercial, só vê leads atribuídos a si mesmo (como SDR ou Closer)
        leadExtraFilters.OR = [
          { sdrId: req.user.id },
          { closerId: req.user.id }
        ];

        appointmentWhere.OR = [
          { sdrId: req.user.id },
          { lead: { closerId: req.user.id } }
        ];

        paymentExtraFilters.appointment = {
          OR: [
            { sdrId: req.user.id },
            { lead: { closerId: req.user.id } }
          ]
        };
      }
    }

    if (sdrId && sdrId !== 'all') {
      const parsedSdrId = sdrId === 'none' ? null : parseInt(sdrId as string);
      leadExtraFilters.sdrId = parsedSdrId;
      
      const sdrCondition = { sdrId: parsedSdrId };
      
      if (appointmentWhere.OR) {
        appointmentWhere.AND = appointmentWhere.AND || [];
        appointmentWhere.AND.push(sdrCondition);
      } else {
        Object.assign(appointmentWhere, sdrCondition);
      }

      if (paymentExtraFilters.appointment) {
        paymentExtraFilters.appointment.AND = paymentExtraFilters.appointment.AND || [];
        paymentExtraFilters.appointment.AND.push(sdrCondition);
      } else {
        paymentExtraFilters.appointment = sdrCondition;
      }
    }

    if (closerId && closerId !== 'all') {
      const parsedCloserId = closerId === 'none' ? null : parseInt(closerId as string);
      leadExtraFilters.closerId = parsedCloserId;
      
      const leadCloserCondition = { lead: { closerId: parsedCloserId } };
      
      if (appointmentWhere.OR) {
        appointmentWhere.AND = appointmentWhere.AND || [];
        appointmentWhere.AND.push(leadCloserCondition);
      } else {
        appointmentWhere.lead = { closerId: parsedCloserId };
      }

      if (paymentExtraFilters.appointment) {
        paymentExtraFilters.appointment.AND = paymentExtraFilters.appointment.AND || [];
        paymentExtraFilters.appointment.AND.push(leadCloserCondition);
      } else {
        paymentExtraFilters.appointment = leadCloserCondition;
      }
    }

    // Mesclando filtros extras ao baseWhere
    Object.assign(baseWhere, leadExtraFilters);

    // Função utilitária para montar os where das demais consultas de lead
    const buildLeadWhere = (statusIn: string[], useUpdatedAt = false) => {
      const where: any = {
        professionalId: { in: professionalIds },
        ...leadExtraFilters
      };
      if (companyId) where.companyId = companyId;
      if (useUpdatedAt) {
        where.updatedAt = { gte: startDate, lte: endDate };
      }
      if (statusIn.length > 0) {
        where.status = { in: statusIn };
      }
      return where;
    };


    // Busca os funis configurados para pegar os estágios dinâmicos
    const funnels = await prisma.funnelConfig.findMany({
      where: companyId ? { companyId } : {},
      include: { stages: { where: { isActive: true }, orderBy: { order: 'asc' } } }
    });

    const prospectStages = funnels.find(f => f.code === 'prospecting')?.stages.map(s => s.code) || [];
    const commercialStages = funnels.find(f => f.code === 'commercial')?.stages.map(s => s.code) || [];

    // Fallbacks
    const finalProspectStages = prospectStages.length > 0 ? prospectStages : ['prospect_lead', 'prospect_qualified', 'prospect_scheduled', 'prospect_attended'];
    const finalCommercialStages = commercialStages.length > 0 ? commercialStages : ['comercial_proposal', 'comercial_follow', 'comercial_closed'];

    // Attended: último do prospect + todos do commercial
    const lastProspectStage = finalProspectStages[finalProspectStages.length - 1];
    const attendedStages = lastProspectStage ? [lastProspectStage, ...finalCommercialStages] : finalCommercialStages;

    // Closed: último do commercial + hardcodes históricos
    const lastCommercialStage = finalCommercialStages[finalCommercialStages.length - 1] || 'comercial_closed';
    const closedStages = Array.from(new Set([lastCommercialStage, 'comercial_closed', 'sales_payment', 'sales_contract', 'sales_post']));

    // 3. Consultas em Paralelo para Performance
    const [
      leadsCount,
      agendamentosConfirmados,
      avaliacoesComparecidas,
      oportunidades,
      faturamentoTotalAgg,
      leadsFechados,
      faturamentoPorMetodo,
      funilStatus,
      origemData,
      faturamentoFechadoAgg
    ] = await Promise.all([
      // 1. Total de Novos Leads (Criados no período)
      prisma.lead.count({ where: baseWhere }),
      
      // 2. Avaliações Agendadas (Para o período selecionado)
      prisma.appointment.count({ 
        where: { ...appointmentWhere, status: { in: ['agendado', 'confirmado'] } } 
      }),
      
      // 3. Avaliações Comparecidas (Leads que estão em status de comparecimento ou superior)
      // Nota: Filtramos por updatedAt para pegar quem mudou para esse status no período
      prisma.lead.count({ 
        where: buildLeadWhere(attendedStages, true) 
      }),
      
      // 4. Oportunidades (Leads em Proposta ou superior no período)
      prisma.lead.count({ 
        where: buildLeadWhere(finalCommercialStages, true) 
      }),
      
      // 5. Faturamento Total (Tudo que foi orçado - Leads em Proposta ou superior - Total histórico ou período)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: buildLeadWhere(finalCommercialStages, false)
      }),

      // 6. Total de Vendas Fechadas (Mudaram para status de fechamento no período)
      prisma.lead.count({
        where: buildLeadWhere(closedStages, true)
      }),

      // 7. Faturamento por Método (Baseado na tabela de Pagamentos - O MAIS PRECISO)
      prisma.payment.groupBy({
        by: ['method', 'status'],
        _sum: { amount: true },
        where: { 
          professionalId: { in: professionalIds }, 
          ...(companyId && { companyId }),
          date: { gte: startDate, lte: endDate },
          ...paymentExtraFilters
        }
      }),

      // 8. Distribuição Atual do Funil (TODOS os leads do profissional - Snapshot)
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
        where: buildLeadWhere([], false)
      }),

      // 9. Leads por Origem (Total Histórico)
      prisma.lead.groupBy({
        by: ['origin'],
        _count: { id: true },
        where: buildLeadWhere([], false)
      }),

      // 11. Faturamento Fechado (Valor dos leads que viraram fechamento no periodo)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: buildLeadWhere(closedStages, true)
      })
    ]);

    // Cálculo da Receita Real
    // Regra: Boleto (transferencia) no entra na Receita Total nem no Faturamento Total. Carto, Pix e Dinheiro entram sempre (pago ou pendente).
    let faturamentoOrcado = Number(faturamentoTotalAgg._sum.value) || 0;
    let faturamentoFechado = Number(faturamentoFechadoAgg._sum.value) || 0;
    
    // 4. KPIs de Eficiência Matemáticos
    
    // Ticket Orçado: Faturamento (Valor de Proposta) / Oportunidades (Número de Propostas)
    let ticketOrcado = oportunidades > 0 
      ? (faturamentoOrcado / oportunidades) 
      : 0; 
      
    // Ticket Fechado: Receita (Valor Fechado) / Vendas Fechadas (Número de Contratos)
    let ticketFechado = leadsFechados > 0 
      ? (faturamentoFechado / leadsFechados) 
      : 0;
      
    // Taxa de Conversão de Leads: Vendas Fechadas / Total de Leads
    const conversaoLeads = leadsCount > 0 
      ? ((leadsFechados / leadsCount) * 100) 
      : 0;

    // Taxa de Conversão por Quantidade de Propostas: Vendas Fechadas / Oportunidades (Propostas)
    const conversaoPropostas = oportunidades > 0
      ? ((leadsFechados / oportunidades) * 100)
      : 0;

    // Taxa de Conversao Financeira: Faturamento Fechado / Faturamento Orcado
    let conversaoFinanceira = faturamentoOrcado > 0 
      ? ((faturamentoFechado / faturamentoOrcado) * 100) 
      : 0;

    // Validação de Permissão de Faturamento para Usuários
    let hasBillingPermission = true;
    if (req.user?.type === 'usuario' && req.user?.role !== 'admin') {
      const userPermissions = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: req.user.id,
            companyId: req.user.companyId || 0,
          },
        },
        include: {
          role: {
            include: {
              permissions: {
                where: { module: { code: 'dashboard' } }
              }
            }
          }
        }
      });
      const perm = userPermissions?.role?.permissions[0];
      const subPerms = perm?.subPermissions as Record<string, boolean> | null;
      if (subPerms && subPerms.verFaturamento === false) {
        hasBillingPermission = false;
      }
    }

    if (!hasBillingPermission) {
      faturamentoOrcado = 0;
      faturamentoFechado = 0;
      ticketOrcado = 0;
      ticketFechado = 0;
      conversaoFinanceira = 0;
    }

    let parcelamentoMedioBoleto = 0;
    if (hasBillingPermission) {
      // Cálculo do Parcelamento Médio de Boleto:
      // Dividir o número de boletos gerados (método 'transferencia') pelo número de contratos fechados que têm boleto
      const boletosGrouped = await prisma.payment.groupBy({
        by: ['clientId'],
        where: {
          method: 'transferencia',
          professionalId: { in: professionalIds },
          ...(companyId && { companyId }),
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { id: true }
      });

      const totalBoletos = boletosGrouped.reduce((acc, curr) => acc + curr._count.id, 0);
      const uniqueContratosComBoleto = boletosGrouped.length;
      parcelamentoMedioBoleto = uniqueContratosComBoleto > 0 
        ? Number((totalBoletos / uniqueContratosComBoleto).toFixed(1))
        : 0;
    }
      
    // Processamento dos Agrupamentos (Sub-Métricas)
    const metodos = hasBillingPermission ? {
      boleto: {
        gerados: faturamentoPorMetodo.filter(m => m.method === 'transferencia').reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0)
        // Removido boleto.pagos conforme solicitado
      },
      cartao: faturamentoPorMetodo.filter(m => m.method === 'cartao' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
      pix: faturamentoPorMetodo.filter(m => m.method === 'pix' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
      dinheiro: faturamentoPorMetodo.filter(m => m.method === 'dinheiro' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
    } : {
      boleto: { gerados: 0, pagos: 0 },
      cartao: 0,
      pix: 0,
      dinheiro: 0
    };

    const totalLeadsGlobal = funilStatus.reduce((acc, curr) => acc + curr._count.id, 0);

    const funil = {
      novos: totalLeadsGlobal, // Estado atual: todos os leads no topo do funil
      contatados: funilStatus.filter(s => ![
        'prospect_lead'
      ].includes(s.status)).reduce((acc, curr) => acc + curr._count.id, 0),
      agendamentos: funilStatus.filter(s => ![
        'prospect_lead', 
        'prospect_qualified'
      ].includes(s.status)).reduce((acc, curr) => acc + curr._count.id, 0),
      fechados: funilStatus.filter(s => [
        'comercial_closed', 
        'sales_payment', 
        'sales_contract', 
        'sales_post'
      ].includes(s.status)).reduce((acc, curr) => acc + curr._count.id, 0),
    };

    const origem = origemData.map(o => ({
      origin: o.origin || 'Desconhecido',
      count: o._count.id
    })).sort((a, b) => b.count - a.count);
    
    const data = {
      leads: leadsCount,
      agendamentos: agendamentosConfirmados,
      comparada: avaliacoesComparecidas,
      oportunidades: oportunidades,
      contratos: leadsFechados,
      faturamento: faturamentoOrcado,
      faturamentoFechado: faturamentoFechado,
      totalDiscount: 0,
      ticketOrcado: ticketOrcado,
      ticketFechado: ticketFechado,
      conversao: conversaoLeads.toFixed(1),
      conversaoPropostas: conversaoPropostas.toFixed(1),
      conversaoFinanceira: conversaoFinanceira.toFixed(1),
      parcelamentoMedioBoleto,
      metodos,
      funil,
      origem
    };

    res.json(createSuccessResponse(data));
  } catch (error: any) {
    console.error('[Dashboard] Erro ao buscar métricas:', error);
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar métricas', 500));
  }
})
