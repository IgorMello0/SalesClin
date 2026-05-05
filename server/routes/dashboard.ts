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
    } else {
      // Fallback para quando o token não tem companyId (ex: Administrador ou profissional autônomo)
      professionalIds = [req.user!.id];
    }

    // 2. Configuração do Range de Datas
    let startDate = new Date(2000, 0, 1);
    let endDate = new Date();
    
    if (filter === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === '7days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else {
      // Custom / Mês Atual (fallback)
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }
    
    // Condições Base Isoladas por Tenant e Data
    const baseWhere = {
      createdAt: { gte: startDate, lte: endDate },
      professionalId: { in: professionalIds }
    };
    const appointmentWhere = {
      startTime: { gte: startDate, lte: endDate },
      professionalId: { in: professionalIds }
    };

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
          updatedAt: { gte: startDate, lte: endDate },
          status: { in: ['prospect_attended', 'comercial_consult', 'comercial_proposal', 'comercial_follow', 'comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] } 
        } 
      }),
      
      // 4. Oportunidades (Leads em Proposta ou superior no período)
      prisma.lead.count({ 
        where: { 
          professionalId: { in: professionalIds },
          updatedAt: { gte: startDate, lte: endDate },
          status: { in: ['comercial_proposal', 'comercial_follow', 'comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] } 
        } 
      }),
      
      // 5. Faturamento Total (Tudo que foi orçado - Leads em Proposta ou superior - Total histórico ou período)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: { 
          professionalId: { in: professionalIds },
          status: { in: ['comercial_proposal', 'comercial_follow', 'comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] }
        }
      }),

      // 6. Total de Vendas Fechadas (Mudaram para status de fechamento no período)
      prisma.lead.count({
        where: { 
          professionalId: { in: professionalIds },
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
          date: { gte: startDate, lte: endDate }
        }
      }),

      // 8. Distribuição Atual do Funil (TODOS os leads do profissional - Snapshot)
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { professionalId: { in: professionalIds } }
      }),

      // 9. Leads por Origem (Total Histórico)
      prisma.lead.groupBy({
        by: ['origin'],
        _count: { id: true },
        where: { professionalId: { in: professionalIds } }
      })
    ]);

    // Cálculo da Receita Real (Soma de todos os pagamentos realizados no período)
    const receitaTotalPeriodo = faturamentoPorMetodo
      .filter(m => m.status === 'pago')
      .reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0);

    const faturamento = Number(faturamentoTotalAgg._sum.value) || 0;
    const receita = receitaTotalPeriodo;
    
    // 4. KPIs de Eficiência Matemáticos
    
    // Ticket Orçado: Faturamento (Valor de Proposta) / Oportunidades (Número de Propostas)
    const ticketOrcado = oportunidades > 0 
      ? (faturamento / oportunidades) 
      : 0; 
      
    // Ticket Fechado: Receita (Valor Fechado) / Vendas Fechadas (Número de Contratos)
    const ticketFechado = leadsFechados > 0 
      ? (receita / leadsFechados) 
      : 0;
      
    // Taxa de Conversão de Leads: Vendas Fechadas / Total de Leads
    const conversaoLeads = leadsCount > 0 
      ? ((leadsFechados / leadsCount) * 100) 
      : 0;

    // Taxa de Conversão Financeira: Receita Efetiva / Faturamento Orçado
    const conversaoFinanceira = faturamento > 0 
      ? ((receita / faturamento) * 100) 
      : 0;
      
    // Processamento dos Agrupamentos (Sub-Métricas)
    const metodos = {
      boleto: {
        gerados: faturamentoPorMetodo.filter(m => m.method === 'boleto').reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
        pagos: faturamentoPorMetodo.filter(m => m.method === 'boleto' && m.status === 'pago').reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0)
      },
      cartao: faturamentoPorMetodo.filter(m => m.method === 'cartao' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
      pix: faturamentoPorMetodo.filter(m => m.method === 'pix' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
      dinheiro: faturamentoPorMetodo.filter(m => m.method === 'dinheiro' && ['pago', 'pendente'].includes(m.status)).reduce((acc, curr) => acc + (Number(curr._sum.amount) || 0), 0),
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
      faturamento: faturamento,
      receita: receita,
      ticketOrcado: ticketOrcado,
      ticketFechado: ticketFechado,
      conversao: conversaoLeads.toFixed(1),
      conversaoFinanceira: conversaoFinanceira.toFixed(1),
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
