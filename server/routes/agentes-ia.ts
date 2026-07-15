import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(), requireModule('conversas'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  
  let companyId = req.user?.companyId;
  if (req.user?.type === 'profissional' && !companyId) {
    const prof = await prisma.professional.findUnique({ where: { id: req.user.id } });
    companyId = prof?.companyId || undefined;
  }

  const where: any = {}
  if (companyId) where.companyId = Number(companyId)

  const [items, total] = await Promise.all([
    prisma.agenteIa.findMany({ skip, take, where, orderBy: { id: 'desc' }, include: { company: true, conversas: true } }),
    prisma.agenteIa.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  
  let companyId = req.user?.companyId;
  if (req.user?.type === 'profissional' && !companyId) {
    const prof = await prisma.professional.findUnique({ where: { id: req.user.id } });
    companyId = prof?.companyId || undefined;
  }

  const item = await prisma.agenteIa.findUnique({ where: { id }, include: { company: true, conversas: true } })
  if (!item) return res.status(404).json(createErrorResponse('Agente IA não encontrado', 404))
  
  if (companyId && item.companyId !== companyId) {
    return res.status(403).json(createErrorResponse('Acesso negado', 403))
  }

  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('conversas'), async (req, res) => {
  const { name, basePrompt, temperature, mode, isActive } = req.body
  
  let companyId = req.user?.companyId;
  if (req.user?.type === 'profissional' && !companyId) {
    const prof = await prisma.professional.findUnique({ where: { id: req.user.id } });
    companyId = prof?.companyId || undefined;
  }

  if (!companyId) {
    return res.status(403).json(createErrorResponse('Clínica não vinculada ao usuário', 403));
  }

  const created = await prisma.agenteIa.create({ data: { companyId, name, basePrompt, temperature, mode, isActive } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const { name, basePrompt, temperature, mode, isActive } = req.body

  let companyId = req.user?.companyId;
  if (req.user?.type === 'profissional' && !companyId) {
    const prof = await prisma.professional.findUnique({ where: { id: req.user.id } });
    companyId = prof?.companyId || undefined;
  }

  const existing = await prisma.agenteIa.findUnique({ where: { id } });
  if (!existing) return res.status(404).json(createErrorResponse('Agente IA não encontrado', 404));
  
  if (companyId && existing.companyId !== companyId) {
    return res.status(403).json(createErrorResponse('Acesso negado', 403));
  }

  const updated = await prisma.agenteIa.update({ where: { id }, data: { name, basePrompt, temperature, mode, isActive } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)

  let companyId = req.user?.companyId;
  if (req.user?.type === 'profissional' && !companyId) {
    const prof = await prisma.professional.findUnique({ where: { id: req.user.id } });
    companyId = prof?.companyId || undefined;
  }

  const existing = await prisma.agenteIa.findUnique({ where: { id } });
  if (!existing) return res.status(404).json(createErrorResponse('Agente IA não encontrado', 404));
  
  if (companyId && existing.companyId !== companyId) {
    return res.status(403).json(createErrorResponse('Acesso negado', 403));
  }

  await prisma.agenteIa.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})

