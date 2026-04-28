import { Router } from 'express'
import { prisma } from '../prisma'
import { auth } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response'

export const router = Router()

// Listar todos os leads
router.get('/', auth(false), async (req, res) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query)
    const { search, status, professionalId } = req.query as any
    const profId = professionalId || req.user?.id

    const where: any = {}
    if (profId) {
      where.professionalId = Number(profId)
    } else {
      return res.json(createSuccessResponse([], { page, pageSize, total: 0 }))
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (status) {
      where.status = status
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.lead.count({ where })
    ])
    res.json(createSuccessResponse(items, { page, pageSize, total }))
  } catch (error: any) {
    console.error('[Leads] Erro ao buscar leads:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar leads', 500))
  }
})

// Buscar lead por ID
router.get('/:id', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const item = await prisma.lead.findUnique({
      where: { id }
    })
    if (!item) return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    res.json(createSuccessResponse(item))
  } catch (error: any) {
    console.error('[Leads] Erro ao buscar lead:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar lead', 500))
  }
})

// Criar novo lead
router.post('/', auth(), async (req, res) => {
  try {
    const { professional_id, name, value, origin, status, avatar, phone, email, age, observations, city, responsible } = req.body
    
    if (!professional_id || !name) {
      return res.status(400).json(createErrorResponse('professional_id e name são obrigatórios', 400))
    }
    
    const created = await prisma.lead.create({
      data: { 
        professionalId: Number(professional_id), 
        name, 
        value: Number(value) || 0, 
        origin, 
        status, 
        avatar, 
        phone, 
        email, 
        age: Number(age) || null, 
        observations, 
        city, 
        responsible 
      }
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Leads] Erro ao criar lead:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar lead', 500))
  }
})

// Atualizar lead
router.put('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = req.body

    // Map snake_case to camelCase if needed for Prisma
    const prismaData: any = { ...data }
    if (data.professional_id) {
      prismaData.professionalId = Number(data.professional_id)
      delete prismaData.professional_id
    }
    if (data.is_scheduled !== undefined) {
      prismaData.isScheduled = Boolean(data.is_scheduled)
      delete prismaData.is_scheduled
    }
    if (data.age !== undefined) prismaData.age = Number(data.age)
    if (data.value !== undefined) prismaData.value = Number(data.value)

    // Buscar lead atual para verificar se já foi convertido
    const currentLead = await prisma.lead.findUnique({ where: { id } })
    if (!currentLead) {
      return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    }

    // Conversão automática: quando status muda para 'comercial_closed'
    const isClosing = prismaData.status === 'comercial_closed' && currentLead.status !== 'comercial_closed'
    const alreadyConverted = !!currentLead.convertedToClientId

    if (isClosing && !alreadyConverted) {
      // Criar cliente automaticamente a partir dos dados do lead
      const newClient = await prisma.client.create({
        data: {
          professionalId: currentLead.professionalId,
          name: currentLead.name,
          email: currentLead.email || null,
          phone: currentLead.phone || null,
          notes: currentLead.observations || null,
        }
      })

      // Atualizar lead com referência ao cliente criado
      prismaData.convertedToClientId = newClient.id
      prismaData.convertedAt = new Date()

      console.log(`[Leads] Lead #${id} convertido automaticamente para Cliente #${newClient.id}`)

      const updated = await prisma.lead.update({
        where: { id },
        data: prismaData
      })

      return res.json(createSuccessResponse({
        ...updated,
        converted: true,
        convertedClient: newClient
      }))
    }
    
    const updated = await prisma.lead.update({
      where: { id },
      data: prismaData
    })
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Leads] Erro ao atualizar lead:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar lead', 500))
  }
})

// Deletar lead
router.delete('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.lead.delete({ where: { id } })
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Leads] Erro ao deletar lead:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao deletar lead', 500))
  }
})
