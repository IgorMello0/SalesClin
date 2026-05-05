import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { companyId } = req.query as any
  const where: any = {}
  if (companyId) where.companyId = Number(companyId)
  const [items, total] = await Promise.all([
    prisma.agenteIa.findMany({ skip, take, where, orderBy: { id: 'desc' }, include: { company: true, conversas: true } }),
    prisma.agenteIa.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.agenteIa.findUnique({ where: { id }, include: { company: true, conversas: true } })
  if (!item) return res.status(404).json(createErrorResponse('Agente IA não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), async (req, res) => {
  const { companyId, name, basePrompt, temperature, mode, isActive } = req.body
  const created = await prisma.agenteIa.create({ data: { companyId, name, basePrompt, temperature, mode, isActive } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { name, basePrompt, temperature, mode, isActive } = req.body
  const updated = await prisma.agenteIa.update({ where: { id }, data: { name, basePrompt, temperature, mode, isActive } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.agenteIa.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


