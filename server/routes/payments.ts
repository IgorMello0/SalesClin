import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(false), requireModule('pagamentos'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { professionalId, clientId, status } = req.query as any
  const where: any = {}
  if (professionalId) where.professionalId = Number(professionalId)
  if (clientId) where.clientId = Number(clientId)
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: { professional: true, client: true, appointment: true }
    }),
    prisma.payment.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(false), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.payment.findUnique({
    where: { id },
    include: { professional: true, client: true, appointment: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Pagamento não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('pagamentos'), async (req, res) => {
  const { appointmentId, clientId, professionalId, amount, method, status, referencePeriod, date } = req.body
  const created = await prisma.payment.create({
    data: { appointmentId, clientId, professionalId, amount, method, status, referencePeriod, date }
  })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const { appointmentId, clientId, professionalId, amount, method, status, referencePeriod, date } = req.body
  const updated = await prisma.payment.update({
    where: { id },
    data: { appointmentId, clientId, professionalId, amount, method, status, referencePeriod, date }
  })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.payment.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


