import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(), requireModule('conversas'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { agentId, clientId } = req.query as any
  
  let companyId = req.user?.companyId;

  if (!companyId) {
    return res.json(createSuccessResponse([], { page, pageSize, total: 0 }));
  }

  const where: any = { companyId };
  if (agentId) where.agentId = Number(agentId)
  if (clientId) where.clientId = Number(clientId)

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
  try {
    const { agentId, clientId, app, channel, startedAt } = req.body
    
    let companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json(createErrorResponse('Empresa não identificada', 400));

    let professionalId: number;

    if (req.user?.type === 'profissional') {
      professionalId = req.user.id;
    } else if (req.user?.type === 'usuario') {
      const empresa = await prisma.empresa.findUnique({
        where: { id: companyId },
        select: { ownerId: true }
      });
      if (!empresa || !empresa.ownerId) {
        return res.status(400).json(createErrorResponse('Profissional responsável não encontrado', 400));
      }
      professionalId = empresa.ownerId;
    } else {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

    const created = await prisma.conversa.create({ 
      data: { 
        companyId, 
        agentId: agentId ? Number(agentId) : null, 
        clientId: clientId ? Number(clientId) : null, 
        professionalId, 
        app, 
        channel, 
        startedAt: startedAt ? new Date(startedAt) : new Date() 
      } 
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    res.status(400).json(createErrorResponse(error.message || 'Erro ao criar conversa', 400))
  }
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


