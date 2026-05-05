import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(false), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const [items, total] = await Promise.all([
    prisma.category.findMany({
      skip,
      take,
      orderBy: { id: 'desc' },
      include: { professional: true, catalogItems: true }
    }),
    prisma.category.count()
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(false), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.category.findUnique({
    where: { id },
    include: { professional: true, catalogItems: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Categoria não encontrada', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), async (req, res) => {
  const { professionalId, name, description, status } = req.body
  const created = await prisma.category.create({ data: { professionalId, name, description, status } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { professionalId, name, description, status } = req.body
  const updated = await prisma.category.update({ where: { id }, data: { professionalId, name, description, status } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.category.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


