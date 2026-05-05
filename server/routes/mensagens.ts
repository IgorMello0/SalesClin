import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { conversationId } = req.query as any
  const where: any = {}
  if (conversationId) where.conversationId = Number(conversationId)

  const [items, total] = await Promise.all([
    prisma.mensagem.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { conversation: true, chatLogs: true } }),
    prisma.mensagem.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.mensagem.findUnique({ where: { id }, include: { conversation: true, chatLogs: true } })
  if (!item) return res.status(404).json(createErrorResponse('Mensagem não encontrada', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), async (req, res) => {
  const { conversationId, sender, content, rawJson, origin } = req.body
  const created = await prisma.mensagem.create({ data: { conversationId, sender, content, rawJson, origin } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { content, rawJson, origin } = req.body
  const updated = await prisma.mensagem.update({ where: { id }, data: { content, rawJson, origin } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.mensagem.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


