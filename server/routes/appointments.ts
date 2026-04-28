import { Router } from 'express'
import { prisma } from '../prisma'
import { auth, requireModule } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response'

export const router = Router()

router.get('/', auth(false), requireModule('agendamentos'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { professionalId, clientId, status } = req.query as any
  const where: any = {}
  if (professionalId) where.professionalId = Number(professionalId)
  if (clientId) where.clientId = Number(clientId)
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take,
      orderBy: { startTime: 'desc' },
      include: { professional: true, client: true, service: true, appointmentLogs: true, payments: true }
    }),
    prisma.appointment.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

// Check availability (olheiro em tempo real)
router.get('/check-availability', auth(false), async (req, res) => {
  try {
    const { professionalId, startTime, endTime } = req.query as any
    if (!professionalId || !startTime || !endTime) {
      return res.status(400).json(createErrorResponse('Parâmetros incompletos', 400))
    }

    const conflicting = await prisma.appointment.findFirst({
      where: {
        professionalId: Number(professionalId),
        status: { not: 'cancelado' },
        AND: [
          { startTime: { lt: new Date(endTime) } },
          { endTime: { gt: new Date(startTime) } }
        ]
      }
    })

    if (conflicting) {
      return res.json(createSuccessResponse({ available: false }))
    }
    return res.json(createSuccessResponse({ available: true }))
  } catch (error) {
    return res.status(500).json(createErrorResponse('Erro ao verificar disponibilidade', 500))
  }
})

router.get('/:id', auth(false), requireModule('agendamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.appointment.findUnique({
    where: { id },
    include: { professional: true, client: true, service: true, appointmentLogs: true, payments: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Agendamento não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('agendamentos'), async (req, res) => {
  const { professionalId, clientId, leadId, tags, serviceId, startTime, endTime, status, notes } = req.body
  
  // Overbooking Validation
  const conflicting = await prisma.appointment.findFirst({
    where: {
      professionalId,
      status: { not: 'cancelado' },
      AND: [
        { startTime: { lt: new Date(endTime) } },
        { endTime: { gt: new Date(startTime) } }
      ]
    }
  });

  if (conflicting) {
    return res.status(409).json(createErrorResponse('Este horário já está ocupado para este profissional.', 409));
  }

  // Update tags if provided
  if (tags && Array.isArray(tags)) {
    if (leadId) {
      await prisma.lead.update({ where: { id: Number(leadId) }, data: { tags } });
    } else if (clientId) {
      await prisma.client.update({ where: { id: Number(clientId) }, data: { tags } });
    }
  }

  const created = await prisma.appointment.create({
    data: { 
      professionalId, 
      clientId: clientId ? Number(clientId) : null, 
      leadId: leadId ? Number(leadId) : null,
      serviceId: serviceId ? Number(serviceId) : null, 
      startTime, 
      endTime, 
      status, 
      notes 
    }
  })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), requireModule('agendamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const { professionalId, clientId, serviceId, startTime, endTime, status, notes } = req.body

  // Overbooking Validation
  const conflicting = await prisma.appointment.findFirst({
    where: {
      professionalId,
      id: { not: id },
      status: { not: 'cancelado' },
      AND: [
        { startTime: { lt: new Date(endTime) } },
        { endTime: { gt: new Date(startTime) } }
      ]
    }
  });

  if (conflicting) {
    return res.status(409).json(createErrorResponse('Este horário já está ocupado para este profissional.', 409));
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { professionalId, clientId, serviceId, startTime, endTime, status, notes }
  })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), requireModule('agendamentos'), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.appointment.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


