import { Router } from 'express'
import { prisma } from '../prisma'
import { auth, requireModule } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response'

export const router = Router()

router.get('/', auth(false), requireModule('clientes'), async (req, res) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query)
    const { search } = req.query as any

    const where: any = {}

    // Filtrar por professionalId do usuário logado
    if (req.user?.type === 'profissional') {
      where.professionalId = req.user.id
    } else if (req.user?.type === 'usuario' && req.user?.companyId) {
      // Usuário: busca clientes de todos os profissionais da empresa
      const companyProfessionals = await prisma.professional.findMany({
        where: { companyId: req.user.companyId },
        select: { id: true }
      })
      where.professionalId = { in: companyProfessionals.map(p => p.id) }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          professional: true,
          appointments: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true
            }
          }
        }
      }),
      prisma.client.count({ where })
    ])
    res.json(createSuccessResponse(items, { page, pageSize, total }))
  } catch (error: any) {
    console.error('[Clients] Erro ao buscar clientes:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar clientes', 500))
  }
})

router.get('/:id', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const item = await prisma.client.findUnique({
      where: { id },
      include: {
        professional: true,
        appointments: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true
          }
        }
        // Removido payments, fichas, chatHistories e conversas temporariamente
      }
    })
    if (!item) return res.status(404).json(createErrorResponse('Cliente não encontrado', 404))
    res.json(createSuccessResponse(item))
  } catch (error: any) {
    console.error('[Clients] Erro ao buscar cliente:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar cliente', 500))
  }
})

router.post('/', auth(), requireModule('clientes'), async (req, res) => {
  try {
    const { professionalId, name, email, phone, dateOfBirth, document, notes } = req.body
    
    if (!professionalId || !name) {
      return res.status(400).json(createErrorResponse('professionalId e name são obrigatórios', 400))
    }
    
    const created = await prisma.client.create({
      data: { professionalId, name, email, phone, dateOfBirth, document, notes }
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Clients] Erro ao criar cliente:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar cliente', 500))
  }
})

router.put('/:id', auth(), requireModule('clientes'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { professionalId, name, email, phone, dateOfBirth, document, notes } = req.body
    
    const updated = await prisma.client.update({
      where: { id },
      data: { professionalId, name, email, phone, dateOfBirth, document, notes }
    })
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Clients] Erro ao atualizar cliente:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Cliente não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar cliente', 500))
  }
})

router.delete('/:id', auth(), requireModule('clientes'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.client.delete({ where: { id } })
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Clients] Erro ao deletar cliente:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Cliente não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao deletar cliente', 500))
  }
})


