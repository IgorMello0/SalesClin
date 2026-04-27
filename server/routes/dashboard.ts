import { Router } from 'express'
import { prisma } from '../prisma'
import { auth, requireModule } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse } from '../utils/response'

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
    console.log("[DASHBOARD DEBUG] companyId:", companyId);
    console.log("[DASHBOARD DEBUG] professionalIds:", professionalIds);
    console.log("[DASHBOARD DEBUG] baseWhere:", baseWhere);

    const [
      leadsCount,
      agendamentosConfirmados,
      avaliacoesComparecidas,
      oportunidades,
      faturamentoTotalAgg,
      receitaTotalAgg,
      leadsFechados,
      faturamentoPorMetodo,
      funilStatus,
      origemData
    ] = await Promise.all([
      // Total de Leads
      prisma.lead.count({ where: baseWhere }),
      
      // Avaliações Agendadas
      prisma.appointment.count({ 
        where: { ...appointmentWhere, status: { in: ['agendado', 'confirmado'] } } 
      }),
      
      // Avaliações Comparecidas (Concluídas)
      prisma.appointment.count({ 
        where: { ...appointmentWhere, status: 'concluido' } 
      }),
      
      // Oportunidades Geradas (Valor > 0 ou status que indique negociação)
      prisma.lead.count({ 
        where: { ...baseWhere, value: { gt: 0 } } 
      }),
      
      // Faturamento Total (Tudo que foi vendido - Pago ou Pendente)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { 
          professionalId: { in: professionalIds }, 
          date: { gte: startDate, lte: endDate },
          status: { in: ['pago', 'pendente', 'atrasado'] }
        }
      }),

      // Receita Total (O que de fato caiu na conta)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { 
          professionalId: { in: professionalIds }, 
          date: { gte: startDate, lte: endDate },
          status: 'pago'
        }
      }),

      // Total de Vendas Fechadas
      prisma.lead.count({
        where: { ...baseWhere, status: 'comercial_closed' }
      }),

      // Faturamento por Método de Pagamento
      prisma.payment.groupBy({
        by: ['method'],
        _sum: { amount: true },
        where: { 
          professionalId: { in: professionalIds }, 
          date: { gte: startDate, lte: endDate },
          status: { in: ['pago', 'pendente', 'atrasado'] }
        }
      }),

      // Funil de Leads (Agrupado por Status)
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
        where: baseWhere
      }),

      // Leads por Origem
      prisma.lead.groupBy({
        by: ['origin'],
        _count: { id: true },
        where: baseWhere
      })
    ]);

    const faturamento = Number(faturamentoTotalAgg._sum.amount) || 0;
    const receita = Number(receitaTotalAgg._sum.amount) || 0;
    
    // 4. KPIs de Eficiência Matemáticos
    
    // Ticket Orçado: Faturamento Total / Avaliações Comparecidas
    // Evitar divisão por zero
    const ticketOrcado = avaliacoesComparecidas > 0 
      ? (faturamento / avaliacoesComparecidas) 
      : (leadsCount > 0 ? (faturamento / leadsCount) : 0); 
      
    // Ticket Fechado: Receita / Vendas Fechadas
    const ticketFechado = leadsFechados > 0 
      ? (receita / leadsFechados) 
      : 0;
      
    // Taxa de Conversão: Vendas Fechadas / Total de Leads
    const conversao = leadsCount > 0 
      ? ((leadsFechados / leadsCount) * 100) 
      : 0;

    // Processamento dos Agrupamentos (Sub-Métricas)
    const metodos = {
      boleto: Number(faturamentoPorMetodo.find(m => m.method === 'boleto')?._sum.amount || 0),
      cartao: Number(faturamentoPorMetodo.find(m => m.method === 'cartao')?._sum.amount || 0),
      pix: Number(faturamentoPorMetodo.find(m => m.method === 'pix')?._sum.amount || 0),
      dinheiro: Number(faturamentoPorMetodo.find(m => m.method === 'dinheiro')?._sum.amount || 0),
    };

    const funil = {
      novos: funilStatus.find(s => s.status === 'prospect_lead' || s.status === 'Novo')?._count.id || 0,
      contatados: funilStatus.find(s => s.status === 'prospect_qualified' || s.status === 'Contatado')?._count.id || 0,
      agendados: funilStatus.find(s => s.status === 'prospect_scheduled' || s.status === 'Agendado')?._count.id || 0,
      fechados: leadsFechados,
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
      conversao: conversao.toFixed(1),
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
