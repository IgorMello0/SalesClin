import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(false), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { clientId, professionalId, type } = req.query as any
  const where: any = {}
  if (clientId) where.clientId = Number(clientId)
  if (professionalId) where.professionalId = Number(professionalId)
  if (type) where.type = type

  const [items, total] = await Promise.all([
    prisma.ficha.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: { client: true, professional: true, template: true }
    }),
    prisma.ficha.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(false), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.ficha.findUnique({
    where: { id },
    include: { client: true, professional: true, template: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Ficha não encontrada', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), async (req, res) => {
  const { clientId, professionalId, type, templateId, content } = req.body
  const created = await prisma.ficha.create({ data: { clientId, professionalId, type, templateId, content } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { type, templateId, content } = req.body
  const updated = await prisma.ficha.update({ where: { id }, data: { type, templateId, content } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.ficha.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


