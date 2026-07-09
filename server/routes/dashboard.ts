import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'

export const router = Router()

router.get('/metrics', auth(false), requireModule('dashboard'), async (req, res) => {
  try {
    const { filter } = req.query;
    
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
    } else if (filter === '7days') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === '30days') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'custom' && req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate as string);
      endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999);
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
      origemData
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
        where: { 
          professionalId: { in: professionalIds },
          ...(companyId && { companyId }),
          updatedAt: { gte: startDate, lte: endDate },
          status: { in: ['prospect_attended', 'comercial_consult', 'comercial_proposal', 'comercial_follow', 'comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] } 
        } 
      }),
      
      // 4. Oportunidades (Leads em Proposta ou superior no período)
      prisma.lead.count({ 
        where: { 
          professionalId: { in: professionalIds },
          ...(companyId && { companyId }),
          updatedAt: { gte: startDate, lte: endDate },
          status: { in: ['comercial_proposal', 'comercial_follow', 'comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] } 
        } 
      }),
      
      // 5. Faturamento Total (Tudo que foi orçado - Leads em Proposta ou superior - Total histórico ou período)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: { 
          professionalId: { in: professionalIds },
          ...(companyId && { companyId }),
          status: { in: ['comercial_proposal', 'comercial_follow', 'comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] }
        }
      }),

      // 6. Total de Vendas Fechadas (Mudaram para status de fechamento no período)
      prisma.lead.count({
        where: { 
          professionalId: { in: professionalIds },
          ...(companyId && { companyId }),
          updatedAt: { gte: startDate, lte: endDate },
          status: { in: ['comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] } 
        }
      }),

      // 7. Faturamento por Método (Baseado na tabela de Pagamentos - O MAIS PRECISO)
      prisma.payment.groupBy({
        by: ['method', 'status'],
        _sum: { amount: true },
        where: { 
          professionalId: { in: professionalIds }, 
          ...(companyId && { companyId }),
          date: { gte: startDate, lte: endDate }
        }
      }),

      // 8. Distribuição Atual do Funil (TODOS os leads do profissional - Snapshot)
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { 
          professionalId: { in: professionalIds },
          ...(companyId && { companyId })
        }
      }),

      // 9. Leads por Origem (Total Histórico)
      prisma.lead.groupBy({
        by: ['origin'],
        _count: { id: true },
        where: { 
          professionalId: { in: professionalIds },
          ...(companyId && { companyId })
        }
      })
    ]);

    // Cálculo da Receita Real (Soma de todos os pagamentos realizados no período)
    const receitaTotalPeriodo = faturamentoPorMetodo
      .filter(m => m.status === 'pago')
      .reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0);

    let faturamento = Number(faturamentoTotalAgg._sum.value) || 0;
    let receita = receitaTotalPeriodo;
    
    // 4. KPIs de Eficiência Matemáticos
    
    // Ticket Orçado: Faturamento (Valor de Proposta) / Oportunidades (Número de Propostas)
    let ticketOrcado = oportunidades > 0 
      ? (faturamento / oportunidades) 
      : 0; 
      
    // Ticket Fechado: Receita (Valor Fechado) / Vendas Fechadas (Número de Contratos)
    let ticketFechado = leadsFechados > 0 
      ? (receita / leadsFechados) 
      : 0;
      
    // Taxa de Conversão de Leads: Vendas Fechadas / Total de Leads
    const conversaoLeads = leadsCount > 0 
      ? ((leadsFechados / leadsCount) * 100) 
      : 0;

    // Taxa de Conversão por Quantidade de Propostas: Vendas Fechadas / Oportunidades (Propostas)
    const conversaoPropostas = oportunidades > 0
      ? ((leadsFechados / oportunidades) * 100)
      : 0;

    // Taxa de Conversão Financeira: Receita Efetiva / Faturamento Orçado
    let conversaoFinanceira = faturamento > 0 
      ? ((receita / faturamento) * 100) 
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
      faturamento = 0;
      receita = 0;
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
          date: { gte: startDate, lte: endDate }
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
      transferencia: {
        gerados: faturamentoPorMetodo.filter(m => m.method === 'transferencia').reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
        pagos: faturamentoPorMetodo.filter(m => m.method === 'transferencia' && m.status === 'pago').reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0)
      },
      cartao: faturamentoPorMetodo.filter(m => m.method === 'cartao' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
      pix: faturamentoPorMetodo.filter(m => m.method === 'pix' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
      dinheiro: faturamentoPorMetodo.filter(m => m.method === 'dinheiro' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
    } : {
      transferencia: { gerados: 0, pagos: 0 },
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
      agendados: funilStatus.filter(s => ![
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
      faturamento: faturamento,
      receita: receita,
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
