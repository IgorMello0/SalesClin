import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { assertAppointmentBelongsToCompany, assertClientBelongsToCompany, getCompanyOwnerProfessionalId } from '../services/tenant.js'

export const router = Router()

router.get('/', auth(), requireModule('pagamentos'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { clientId, status } = req.query as any
  const professionalId = await getCompanyOwnerProfessionalId(req.user?.companyId)
  const where: any = { professionalId, companyId: req.user!.companyId }
  if (clientId) where.clientId = Number(clientId)
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: { professional: { select: { id: true, name: true } }, client: true, appointment: true }
    }),
    prisma.payment.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.payment.findFirst({
    where: { id, companyId: req.user!.companyId },
    include: { professional: { select: { id: true, name: true } }, client: true, appointment: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Pagamento não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('pagamentos'), async (req, res) => {
  try {
    const { appointmentId, clientId, amount, method, status, referencePeriod, date } = req.body
    
    if (!clientId || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json(createErrorResponse('Cliente e valor valido sao obrigatorios.', 400))
    }

    const professionalId = await getCompanyOwnerProfessionalId(req.user?.companyId)
    const client = await assertClientBelongsToCompany(Number(clientId), req.user?.companyId)
    if (appointmentId) {
      const appointment = await assertAppointmentBelongsToCompany(Number(appointmentId), req.user?.companyId)
      if (appointment.clientId && appointment.clientId !== client.id) {
        return res.status(400).json(createErrorResponse('O agendamento pertence a outro cliente.', 400))
      }
    }

    const created = await prisma.payment.create({
      data: { 
        appointmentId: appointmentId ? Number(appointmentId) : null, 
        clientId: clientId ? Number(clientId) : null, 
        professionalId, 
        companyId: req.user.companyId,
        amount: Number(amount), 
        method, 
        status, 
        referencePeriod, 
        date: date ? new Date(date) : new Date() 
      }
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Payments] Erro ao criar pagamento:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar pagamento', 500))
  }
})

router.put('/:id', auth(), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const { appointmentId, clientId, amount, method, status, referencePeriod, date } = req.body
  const current = await prisma.payment.findFirst({
    where: { id, companyId: req.user!.companyId },
    select: { id: true },
  })
  if (!current) return res.status(404).json(createErrorResponse('Pagamento não encontrado', 404))
  const client = clientId ? await assertClientBelongsToCompany(Number(clientId), req.user?.companyId) : null
  if (appointmentId) {
    const appointment = await assertAppointmentBelongsToCompany(Number(appointmentId), req.user?.companyId)
    if (client && appointment.clientId && appointment.clientId !== client.id) {
      return res.status(400).json(createErrorResponse('O agendamento pertence a outro cliente.', 400))
    }
  }
  if (amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
    return res.status(400).json(createErrorResponse('Valor invalido.', 400))
  }
  const updated = await prisma.payment.update({
    where: { id: current.id },
    data: {
      appointmentId: appointmentId === undefined ? undefined : (appointmentId ? Number(appointmentId) : null),
      clientId: clientId === undefined ? undefined : (clientId ? Number(clientId) : null),
      amount: amount === undefined ? undefined : Number(amount),
      method,
      status,
      referencePeriod,
      date: date === undefined ? undefined : new Date(date),
    }
  })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const current = await prisma.payment.findFirst({
    where: { id, companyId: req.user!.companyId },
    select: { id: true },
  })
  if (!current) return res.status(404).json(createErrorResponse('Pagamento não encontrado', 404))
  await prisma.payment.delete({ where: { id: current.id } })
  res.json(createSuccessResponse({ id }))
})
