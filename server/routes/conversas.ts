import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(), requireModule('conversas'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { companyId, agentId, clientId, professionalId } = req.query as any
  const where: any = {}
  if (companyId) where.companyId = Number(companyId)
  if (agentId) where.agentId = Number(agentId)
  if (clientId) where.clientId = Number(clientId)
  if (professionalId) where.professionalId = Number(professionalId)

  const [items, total] = await Promise.all([
    prisma.conversa.findMany({
      where,
      skip,
      take,
      orderBy: { startedAt: 'desc' },
      include: { company: true, agent: true, client: true, professional: true, mensagens: true }
    }),
    prisma.conversa.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.conversa.findUnique({
    where: { id },
    include: { company: true, agent: true, client: true, professional: true, mensagens: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Conversa não encontrada', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('conversas'), async (req, res) => {
  const { companyId, agentId, clientId, professionalId, app, channel, startedAt } = req.body
  const created = await prisma.conversa.create({ data: { companyId, agentId, clientId, professionalId, app, channel, startedAt } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { agentId, clientId, professionalId, app, channel } = req.body
  const updated = await prisma.conversa.update({ where: { id }, data: { agentId, clientId, professionalId, app, channel } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.conversa.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


