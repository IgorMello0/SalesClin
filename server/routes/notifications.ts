import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createSuccessResponse, createErrorResponse } from '../utils/response.js'

export const router = Router()

// Listar notificações do usuário logado
router.get('/', auth(), async (req, res) => {
  try {
    const recipientId = req.user!.id
    const companyId = req.user!.companyId

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Clínica não definida', 400))
    }

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId,
        companyId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Pegar as 20 mais recentes
    })

    res.json(createSuccessResponse(notifications))
  } catch (error) {
    console.error('[Notifications] Erro ao buscar:', error)
    res.status(500).json(createErrorResponse('Erro ao buscar notificações', 500))
  }
})

// Marcar todas como lidas
router.put('/read-all', auth(), async (req, res) => {
  try {
    const recipientId = req.user!.id
    const companyId = req.user!.companyId

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Clínica não definida', 400))
    }

    await prisma.notification.updateMany({
      where: {
        recipientId,
        companyId,
        read: false
      },
      data: {
        read: true
      }
    })

    res.json(createSuccessResponse({ success: true }))
  } catch (error) {
    console.error('[Notifications] Erro ao marcar todas como lidas:', error)
    res.status(500).json(createErrorResponse('Erro ao atualizar notificações', 500))
  }
})

// Marcar uma específica como lida
router.put('/:id/read', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const recipientId = req.user!.id

    const notification = await prisma.notification.findUnique({
      where: { id }
    })

    if (!notification) {
      return res.status(404).json(createErrorResponse('Notificação não encontrada', 404))
    }

    if (notification.recipientId !== recipientId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    })

    res.json(createSuccessResponse(updated))
  } catch (error) {
    console.error('[Notifications] Erro ao marcar como lida:', error)
    res.status(500).json(createErrorResponse('Erro ao atualizar notificação', 500))
  }
})
