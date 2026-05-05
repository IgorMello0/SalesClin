import { Router } from 'express'
import { prisma } from '../prisma'
import { auth } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse } from '../utils/response'

export const router = Router()

// Listar cargos da empresa do usuário logado
router.get('/', auth(), async (req, res) => {
  try {
    let companyId: number | undefined

    if (req.user?.type === 'profissional') {
      const prof = await prisma.professional.findUnique({
        where: { id: req.user.id },
        select: { companyId: true }
      })
      companyId = prof?.companyId || undefined
    } else if (req.user?.type === 'usuario') {
      companyId = req.user.companyId || undefined
    }

    if (!companyId) {
      return res.status(404).json(createErrorResponse('Empresa não encontrada', 404))
    }

    const roles = await prisma.role.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    })

    res.json(createSuccessResponse(roles))
  } catch (error: any) {
    console.error('[Roles] Erro ao listar:', error)
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})

// Criar novo cargo
router.post('/', auth(), async (req, res) => {
  try {
    const { name, value } = req.body
    let companyId: number | undefined

    if (req.user?.type === 'profissional') {
      const prof = await prisma.professional.findUnique({
        where: { id: req.user.id },
        select: { companyId: true }
      })
      companyId = prof?.companyId || undefined
    } else if (req.user?.type === 'usuario') {
      companyId = req.user.companyId || undefined
    }

    if (!companyId) {
      return res.status(404).json(createErrorResponse('Empresa não encontrada', 404))
    }

    // Verificar se já existe
    const existing = await prisma.role.findFirst({
      where: { companyId, value }
    })

    if (existing) {
      return res.status(400).json(createErrorResponse('Este cargo já existe nesta empresa', 400))
    }

    const created = await prisma.role.create({
      data: {
        companyId,
        name,
        value
      }
    })

    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Roles] Erro ao criar:', error)
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})

// Deletar cargo
router.delete('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.role.delete({ where: { id } })
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Roles] Erro ao deletar:', error)
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})
