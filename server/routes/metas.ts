import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'

export const router = Router()

// Listar metas do profissional
router.get('/', auth(false), async (req, res) => {
  try {
    const professionalId = req.query.professionalId || req.user?.id
    if (!professionalId) return res.status(400).json(createErrorResponse('professionalId é obrigatório', 400))

    const items = await prisma.goal.findMany({
      where: { professionalId: Number(professionalId) },
      orderBy: { createdAt: 'desc' }
    })
    
    // Converter Decimals para Number para facilitar o uso no frontend
    const mappedItems = items.map(item => ({
      ...item,
      revenueTarget: Number(item.revenueTarget),
      avgTicket: Number(item.avgTicket)
    }))
    
    res.json(createSuccessResponse(mappedItems))
  } catch (error: any) {
    console.error('[Metas] Erro ao buscar metas:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar metas', 500))
  }
})

// Salvar nova meta
router.post('/', auth(), async (req, res) => {
  try {
    const { professionalId, name, revenueTarget, avgTicket, schedulingRate, showupRate, closingRate } = req.body
    
    if (!professionalId || !name) {
      return res.status(400).json(createErrorResponse('Dados incompletos', 400))
    }
    
    const created = await prisma.goal.create({
      data: { 
        professionalId: Number(professionalId), 
        name, 
        revenueTarget: Number(revenueTarget), 
        avgTicket: Number(avgTicket), 
        schedulingRate: Number(schedulingRate), 
        showupRate: Number(showupRate), 
        closingRate: Number(closingRate)
      }
    })
    
    res.json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Metas] Erro ao salvar meta:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao salvar meta', 500))
  }
})

// Deletar meta
router.delete('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.goal.delete({ where: { id } })
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Metas] Erro ao excluir meta:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao excluir meta', 500))
  }
})
