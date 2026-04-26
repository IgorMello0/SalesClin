import { Router } from 'express'
import { prisma } from '../prisma'
import { auth, requireModule } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response'

export const router = Router()

router.get('/', auth(false), requireModule('catalogos'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const professionalId = req.query.professionalId || req.user?.id
  
  const where: any = {}
  if (professionalId) {
    where.professionalId = Number(professionalId)
  } else {
    // Se não houver professionalId, retorna vazio para não misturar dados
    return res.json(createSuccessResponse([], { page, pageSize, total: 0 }))
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: { professional: true, category: true, appointments: true }
    }),
    prisma.catalogItem.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(false), requireModule('catalogos'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.catalogItem.findUnique({
    where: { id },
    include: { professional: true, category: true, appointments: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Item de catálogo não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('catalogos'), async (req, res) => {
  try {
    const { professionalId, categoryId, name, description, price, imageUrl, status, durationMinutes } = req.body
    
    // Garantir que professionalId seja número
    const professionalIdNum = typeof professionalId === 'string' ? parseInt(professionalId) : professionalId
    const categoryIdNum = categoryId ? (typeof categoryId === 'string' ? parseInt(categoryId) : categoryId) : null
    
    const created = await prisma.catalogItem.create({
      data: { 
        professionalId: professionalIdNum, 
        categoryId: categoryIdNum, 
        name, 
        description, 
        price, 
        imageUrl, 
        status, 
        durationMinutes 
      }
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error) {
    res.status(400).json(createErrorResponse(
      error instanceof Error ? error.message : 'Erro ao criar item de catálogo',
      400
    ))
  }
})

router.put('/:id', auth(), requireModule('catalogos'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { professionalId, categoryId, name, description, price, imageUrl, status, durationMinutes } = req.body
    
    // Garantir que professionalId seja número
    const professionalIdNum = typeof professionalId === 'string' ? parseInt(professionalId) : professionalId
    const categoryIdNum = categoryId ? (typeof categoryId === 'string' ? parseInt(categoryId) : categoryId) : null
    
    const updated = await prisma.catalogItem.update({
      where: { id },
      data: { 
        professionalId: professionalIdNum, 
        categoryId: categoryIdNum, 
        name, 
        description, 
        price, 
        imageUrl, 
        status, 
        durationMinutes 
      }
    })
    res.json(createSuccessResponse(updated))
  } catch (error) {
    res.status(400).json(createErrorResponse(
      error instanceof Error ? error.message : 'Erro ao atualizar item de catálogo',
      400
    ))
  }
})

router.delete('/:id', auth(), requireModule('catalogos'), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.catalogItem.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


