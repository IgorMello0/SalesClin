import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(false), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const [items, total] = await Promise.all([
    prisma.fichaTemplate.findMany({
      skip,
      take,
      orderBy: { id: 'desc' },
      include: { creator: true, fichas: true }
    }),
    prisma.fichaTemplate.count()
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(false), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.fichaTemplate.findUnique({
    where: { id },
    include: { creator: true, fichas: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Template não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), async (req, res) => {
  const { name, description, category, fields, createdBy } = req.body
  const created = await prisma.fichaTemplate.create({ data: { name, description, category, fields, createdBy } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { name, description, category, fields } = req.body
  const updated = await prisma.fichaTemplate.update({ where: { id }, data: { name, description, category, fields } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.fichaTemplate.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


