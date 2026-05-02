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

    let companyId = req.user?.companyId;

    if (req.user?.type === 'profissional' && !companyId) {
      const prof = await prisma.professional.findUnique({
        where: { id: req.user.id },
        select: { companyId: true }
      });
      companyId = prof?.companyId || undefined;
    }

    if (companyId) {
      const companyProfessionals = await prisma.professional.findMany({
        where: { companyId },
        select: { id: true }
      });
      where.professionalId = { in: companyProfessionals.map(p => p.id) };
    } else if (req.user?.id) {
      where.professionalId = req.user.id;
    }


    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // TEMPORARY DEBUG:
    if (req.query.debug === 'true') {
      return res.json({ success: true, debug: { user: req.user, where, companyId } });
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
    
    let companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !companyId) {
      const prof = await prisma.professional.findUnique({
        where: { id: req.user.id },
        select: { companyId: true }
      });
      companyId = prof?.companyId || undefined;
    }

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
      }
    })
    
    if (!item) return res.status(404).json(createErrorResponse('Cliente não encontrado', 404))

    if (companyId) {
      if (item.professional.companyId !== companyId) {
        return res.status(403).json(createErrorResponse('Acesso negado', 403))
      }
    } else if (req.user?.id && item.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

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


