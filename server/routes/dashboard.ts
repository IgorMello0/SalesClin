import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const router = Router()

router.get('/metrics', auth(), requireModule('dashboard'), async (req, res) => {
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

    // 2. Configuração do Range de Datas (Corrigido com Timezone)
    const timeZone = 'America/Sao_Paulo';
    let startDate: Date;
    let endDate: Date;

    const now = new Date();
    // Pega o momento atual no fuso do Brasil, mantendo o "tempo de relógio" igual para usar os métodos Date locais
    const nowZoned = toZonedTime(now, timeZone);
    
    if (filter === 'today') {
      nowZoned.setHours(0, 0, 0, 0);
      startDate = fromZonedTime(nowZoned, timeZone);
      
      nowZoned.setHours(23, 59, 59, 999);
      endDate = fromZonedTime(nowZoned, timeZone);
    } else if (filter === '7days') {
      nowZoned.setHours(23, 59, 59, 999);
      endDate = fromZonedTime(nowZoned, timeZone);

      nowZoned.setDate(nowZoned.getDate() - 7);
      nowZoned.setHours(0, 0, 0, 0);
      startDate = fromZonedTime(nowZoned, timeZone);
    } else if (filter === '30days') {
      nowZoned.setHours(23, 59, 59, 999);
      endDate = fromZonedTime(nowZoned, timeZone);

      nowZoned.setDate(nowZoned.getDate() - 30);
      nowZoned.setHours(0, 0, 0, 0);
      startDate = fromZonedTime(nowZoned, timeZone);
    } else if (filter === 'custom' && req.query.startDate && req.query.endDate) {
      const startStr = (req.query.startDate as string).split('T')[0];
      const endStr = (req.query.endDate as string).split('T')[0];

      // Garante que a data seja interpretada no fuso horário do Brasil (UTC-03:00) 
      // desde o momento do parse, evitando o recuo de 1 dia do Date nativo.
      startDate = new Date(`${startStr}T00:00:00-03:00`);
      endDate = new Date(`${endStr}T23:59:59-03:00`);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Datas de filtro customizado inválidas.");
      }
    } else {
      // 'this_month' ou fallback
      const startOfMonth = new Date(nowZoned.getFullYear(), nowZoned.getMonth(), 1, 0, 0, 0, 0);
      startDate = fromZonedTime(startOfMonth, timeZone);
      
      const endOfMonth = new Date(nowZoned.getFullYear(), nowZoned.getMonth() + 1, 0, 23, 59, 59, 999);
      endDate = fromZonedTime(endOfMonth, timeZone);
    }
    
    // Condições Base Isoladas por Tenant e Data
    const baseWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      professionalId: { in: professionalIds }
    };
    if (companyId) baseWhere.companyId = companyId;

    const appointmentWhere: any = {
      startTime: { gte: startDate, lte: endDate },
      professionalId: { in: professionalIds },
      status: { in: ['agendado', 'confirmado', 'concluido'] }
    };
    if (companyId) appointmentWhere.companyId = companyId;
    appointmentWhere.AND = [];

    // 2.5 Lógica de Filtros por SDR e Closer
    const leadExtraFilters: any = {};
    const paymentExtraFilters: any = {};
    const paymentExtraConditions: any[] = [];

    // Regra de Visibilidade de Leads
    if (req.user?.type === 'usuario') {
      const dbUser = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        include: { role: true }
      });
      if (dbUser?.role && !dbUser.role.isAdmin && !dbUser.role.isManager) {
        // Se não for Admin nem Gestor Comercial, só vê leads atribuídos a si mesmo (como SDR ou Closer) ou propostas vinculadas a si
        leadExtraFilters.OR = [
          { sdrId: req.user.id },
          { closerId: req.user.id },
          { proposals: { some: { sdrId: req.user.id } } },
          { proposals: { some: { salespersonId: req.user.id } } },
          { proposals: { some: { specialistId: req.user.id } } }
        ];

        appointmentWhere.AND.push({
          OR: [
            { sdrId: req.user.id },
            { especialistaId: req.user.id },
            { lead: { closerId: req.user.id } }
          ]
        });

        paymentExtraConditions.push({
          OR: [
            { appointment: { sdrId: req.user.id } },
            { appointment: { especialistaId: req.user.id } },
            { appointment: { lead: { closerId: req.user.id } } },
            { client: { originLead: { sdrId: req.user.id } } },
            { client: { originLead: { closerId: req.user.id } } },
            { client: { originLead: { proposals: { some: { sdrId: req.user.id } } } } },
            { client: { originLead: { proposals: { some: { salespersonId: req.user.id } } } } },
            { client: { originLead: { proposals: { some: { specialistId: req.user.id } } } } }
          ]
        });
      }
    }

    if (sdrId && sdrId !== 'all') {
      const parsedSdrId = sdrId === 'none' ? null : parseInt(sdrId as string);
      leadExtraFilters.AND = leadExtraFilters.AND || [];
      leadExtraFilters.AND.push({
        OR: [
          { sdrId: parsedSdrId },
          { proposals: { some: { sdrId: parsedSdrId } } }
        ]
      });
      
      const sdrCondition = { 
        OR: [
          { sdrId: parsedSdrId },
          { lead: { sdrId: parsedSdrId } }
        ]
      };
      
      appointmentWhere.AND.push(sdrCondition);

      paymentExtraConditions.push({
        OR: [
          { appointment: { sdrId: parsedSdrId } },
          { appointment: { lead: { sdrId: parsedSdrId } } },
          { client: { originLead: { sdrId: parsedSdrId } } }
        ]
      });
    }

    if (closerId && closerId !== 'all') {
      const parsedCloserId = closerId === 'none' ? null : parseInt(closerId as string);
      leadExtraFilters.AND = leadExtraFilters.AND || [];
      leadExtraFilters.AND.push({
        OR: [
          { closerId: parsedCloserId },
          { proposals: { some: { salespersonId: parsedCloserId } } }
        ]
      });
      
      const leadCloserCondition = { 
        OR: [
          { especialistaId: parsedCloserId },
          { lead: { closerId: parsedCloserId } }
        ]
      };
      
      appointmentWhere.AND.push(leadCloserCondition);

      paymentExtraConditions.push({
        OR: [
          { appointment: { especialistaId: parsedCloserId } },
          { appointment: { lead: { closerId: parsedCloserId } } },
          { client: { originLead: { closerId: parsedCloserId } } }
        ]
      });
    }

    if (paymentExtraConditions.length > 0) {
      paymentExtraFilters.AND = paymentExtraConditions;
    }

    // Mesclando filtros extras ao baseWhere
    Object.assign(baseWhere, leadExtraFilters);

    // Função utilitária para montar os where das demais consultas de lead
    const buildLeadWhere = (statusIn: string[], dateField?: string) => {
      const where: any = {
        professionalId: { in: professionalIds },
        ...leadExtraFilters
      };
      if (companyId) where.companyId = companyId;
      if (dateField) {
        where[dateField] = { gte: startDate, lte: endDate };
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

    // Attended: 'prospect_attended' + todos do commercial
    const attendedStages = ['prospect_attended', ...finalCommercialStages];

    // Closed: 'comercial_closed' + hardcodes históricos
    const closedStages = Array.from(new Set(['comercial_closed', 'sales_payment', 'sales_contract', 'sales_post']));

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
        where: appointmentWhere
      }),
      
      // 3. Avaliações Comparecidas (Leads que estão em status de comparecimento ou superior)
      prisma.lead.count({ 
        where: buildLeadWhere(attendedStages, 'attendedAt') 
      }),
      
      // 4. Oportunidades (Leads em Proposta ou superior no período)
      prisma.lead.count({ 
        where: buildLeadWhere(finalCommercialStages, 'proposalAt') 
      }),
      
      // 5. Faturamento Total (Tudo que foi orçado - Leads em Proposta ou superior - Total histórico ou período)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: buildLeadWhere(finalCommercialStages, 'proposalAt')
      }),

      // 6. Total de Vendas Fechadas (Mudaram para status de fechamento no período)
      prisma.lead.count({
        where: buildLeadWhere(closedStages, 'closedAt')
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
        where: buildLeadWhere([])
      }),

      // 9. Leads por Origem (Total Histórico)
      prisma.lead.groupBy({
        by: ['origin'],
        _count: { id: true },
        where: buildLeadWhere([])
      }),

      // 11. Faturamento Fechado (Valor dos leads que viraram fechamento no periodo)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: buildLeadWhere(closedStages, 'closedAt')
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
        by: ['clientId', 'appointmentId'],
        where: {
          method: 'transferencia',
          professionalId: { in: professionalIds },
          ...(companyId && { companyId }),
          date: { gte: startDate, lte: endDate },
          ...paymentExtraFilters
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
      novos: totalLeadsGlobal, 
      contatados: funilStatus.filter(s => {
        const topStage = finalProspectStages[0] || 'prospect_lead';
        return s.status !== topStage;
      }).reduce((acc, curr) => acc + curr._count.id, 0),
      agendamentos: funilStatus.filter(s => {
        const ignoredStages = finalProspectStages.slice(0, 2);
        if (ignoredStages.length === 0) ignoredStages.push('prospect_lead', 'prospect_qualified');
        return !ignoredStages.includes(s.status);
      }).reduce((acc, curr) => acc + curr._count.id, 0),
      fechados: funilStatus.filter(s => closedStages.includes(s.status)).reduce((acc, curr) => acc + curr._count.id, 0),
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
