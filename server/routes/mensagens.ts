import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(), requireModule('conversas'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { conversationId } = req.query as any
  const companyId = Number(req.user?.companyId)
  if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
  const where: any = { conversation: { companyId } }
  if (conversationId) where.conversationId = Number(conversationId)

  const [items, total] = await Promise.all([
    prisma.mensagem.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { conversation: true, chatLogs: true } }),
    prisma.mensagem.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const companyId = Number(req.user?.companyId)
  const item = await prisma.mensagem.findFirst({ where: { id, conversation: { companyId } }, include: { conversation: true, chatLogs: true } })
  if (!item) return res.status(404).json(createErrorResponse('Mensagem não encontrada', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('conversas'), async (req, res) => {
  const { conversationId, sender, content, rawJson, origin } = req.body
  const companyId = Number(req.user?.companyId)
  const conversation = await prisma.conversa.findFirst({ where: { id: Number(conversationId), companyId }, select: { id: true } })
  if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))
  const created = await prisma.mensagem.create({ data: { conversationId: Number(conversationId), sender, content, rawJson, origin } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const companyId = Number(req.user?.companyId)
  const existing = await prisma.mensagem.findFirst({ where: { id, conversation: { companyId } }, select: { id: true } })
  if (!existing) return res.status(404).json(createErrorResponse('Mensagem nao encontrada', 404))
  const { content, rawJson, origin } = req.body
  const updated = await prisma.mensagem.update({ where: { id }, data: { content, rawJson, origin } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const companyId = Number(req.user?.companyId)
  const existing = await prisma.mensagem.findFirst({ where: { id, conversation: { companyId } }, select: { id: true } })
  if (!existing) return res.status(404).json(createErrorResponse('Mensagem nao encontrada', 404))
  await prisma.mensagem.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})
