import { Router } from 'express'
import { prisma } from '../prisma'
import { auth, requireModule } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse } from '../utils/response'

export const router = Router()

router.get('/metrics', auth(false), requireModule('dashboard'), async (req, res) => {
  try {
    const { filter, professionalId } = req.query;
    
    // Configurar o range de datas com base no filtro
    let startDate = new Date(2000, 0, 1); // fallback long time ago
    let endDate = new Date();
    
    if (filter === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === '7days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }
    
    // Condições base
    const whereClient: any = { createdAt: { gte: startDate, lte: endDate } };
    const whereAppointments: any = { 
        startTime: { gte: startDate, lte: endDate },
        // if we want to filter by professional, we'd add it here
    };

    // Consultas em paralelo para performance
    const [leadsCount, agendamentosCount, oportunidadesCount, faturamentoResults] = await Promise.all([
      prisma.client.count({ where: whereClient }),
      prisma.appointment.count({ where: whereAppointments }),
      prisma.appointment.count({ where: { ...whereAppointments, status: 'agendado' } }), // Oportunidades
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'pago', createdAt: { gte: startDate, lte: endDate } }
      })
    ]);

    const faturamento = Number(faturamentoResults._sum.amount) || 0;
    
    // Ticket médio / Conversão (lógica baseada em Mock original, mas com dados reais)
    const ticketOrcado = leadsCount > 0 ? (faturamento / leadsCount) * 1.5 : 0;
    const ticketFechado = agendamentosCount > 0 ? (faturamento / agendamentosCount) : 0;
    const conversao = leadsCount > 0 ? ((agendamentosCount / leadsCount) * 100) : 0;

    const data = {
      leads: leadsCount,
      agendamentos: agendamentosCount,
      comparada: Math.floor(agendamentosCount * 0.8), // Placeholder logic if 'comparada' represents attended 
      oportunidades: oportunidadesCount,
      faturamento: faturamento,
      ticketOrcado: ticketOrcado,
      ticketFechado: ticketFechado,
      conversao: conversao.toFixed(1)
    };

    res.json(createSuccessResponse(data));
  } catch (error: any) {
    console.error('[Dashboard] Erro ao buscar métricas:', error);
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar métricas', 500));
  }
})
