import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { logAudit } from '../utils/audit.js'

export const router = Router()

router.get('/', auth(false), requireModule('agendamentos'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { professionalId, clientId, status } = req.query as any
  let profId: number | undefined;
  let companyId: number | undefined;

  if (req.user?.type === 'profissional') {
    profId = req.user.id;
    companyId = req.user.companyId;
  } else if (req.user?.type === 'usuario') {
    // Buscar o dono da empresa do usuário
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user.companyId! },
      select: { ownerId: true }
    });
    profId = empresa?.ownerId || undefined;
    companyId = req.user.companyId;
  } else if (professionalId) {
    profId = Number(professionalId);
    companyId = req.user?.companyId;
  }

  if (!profId) {
    return res.json(createSuccessResponse([], { page, pageSize, total: 0 }));
  }

  const where: any = { professionalId: profId };
  if (companyId) {
    where.companyId = companyId;
  }
  if (clientId) where.clientId = Number(clientId)
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take,
      orderBy: { startTime: 'desc' },
      include: { professional: true, client: true, lead: true, service: true, appointmentLogs: true, payments: true }
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

// Horários disponíveis para um dia específico
router.get('/available-slots', auth(false), async (req, res) => {
  try {
    const { professionalId, date, durationMinutes } = req.query as any
    if (!professionalId || !date) {
      return res.status(400).json(createErrorResponse('Parâmetros incompletos', 400))
    }

    const duration = Number(durationMinutes) || 60
    const SLOT_INTERVAL = 15 // minutos

    // 1. Busca os horários da empresa
    const prof = await prisma.professional.findUnique({
      where: { id: Number(professionalId) },
      include: { company: true }
    })
    
    const openHourStr = prof?.company?.openHour || "08:00"
    const closeHourStr = prof?.company?.closeHour || "20:00"

    const [openH, openM] = openHourStr.split(':').map(Number)
    const [closeH, closeM] = closeHourStr.split(':').map(Number)
    
    const startMinutes = openH * 60 + openM
    const endMinutes = closeH * 60 + closeM
    const totalMinutes = endMinutes - startMinutes

    // Busca todos agendamentos do profissional no dia usando fuso de Brasília (UTC-3)
    const dayStart = new Date(`${date}T00:00:00.000-03:00`)
    const dayEnd   = new Date(`${date}T23:59:59.999-03:00`)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: Number(professionalId),
        status: { not: 'cancelado' },
        startTime: { gte: dayStart, lte: dayEnd }
      },
      select: { startTime: true, endTime: true }
    })

    // Gera todos os slots possíveis
    const slots: string[] = []
    const now = new Date() // Tempo UTC atual

    for (let m = 0; m <= totalMinutes - duration; m += SLOT_INTERVAL) {
      const currentMin = startMinutes + m
      const slotHour   = Math.floor(currentMin / 60)
      const slotMinute = currentMin % 60
      
      // Cria o objeto de data para este slot específico forçando o fuso -03:00
      const slotStart = new Date(`${date}T${String(slotHour).padStart(2,'0')}:${String(slotMinute).padStart(2,'0')}:00-03:00`)
      const slotEnd   = new Date(slotStart.getTime() + duration * 60000)

      // 1. Restrição de Passado: Não mostrar horários que já passaram se for hoje
      if (slotStart < now) {
        continue;
      }

      // 2. Verifica conflito com qualquer agendamento existente
      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.startTime)
        const aptEnd   = new Date(apt.endTime)
        return slotStart < aptEnd && slotEnd > aptStart
      })

      if (!hasConflict) {
        slots.push(`${String(slotHour).padStart(2,'0')}:${String(slotMinute).padStart(2,'0')}`)
      }
    }

    return res.json(createSuccessResponse(slots))
  } catch (error) {
    return res.status(500).json(createErrorResponse('Erro ao buscar horários disponíveis', 500))
  }
})

router.get('/:id', auth(false), requireModule('agendamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.appointment.findUnique({
    where: { id },
    include: { professional: true, client: true, lead: true, service: true, appointmentLogs: true, payments: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Agendamento não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('agendamentos'), async (req, res) => {
  try {
    const { clientId, leadId, tags, serviceId, startTime, endTime, status, notes } = req.body
    
    let professionalId: number;

    if (req.user?.type === 'profissional') {
      professionalId = req.user.id;
    } else if (req.user?.type === 'usuario') {
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.companyId! },
        select: { ownerId: true }
      });
      if (!empresa || !empresa.ownerId) {
        return res.status(400).json(createErrorResponse('Empresa ou Profissional responsável não encontrado', 400));
      }
      professionalId = empresa.ownerId;
    } else {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

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
        companyId: req.user.companyId,
        clientId: clientId ? Number(clientId) : null, 
        leadId: leadId ? Number(leadId) : null,
        serviceId: serviceId ? Number(serviceId) : null, 
        startTime: new Date(startTime), 
        endTime: new Date(endTime), 
        status: status || 'agendado', 
        notes 
      }
    })
    
    logAudit(req.user.id, 'CRIAR_AGENDAMENTO', 'Appointment', created.id)
    
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Appointments] Erro ao criar agendamento:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar agendamento', 500))
  }
})

router.put('/:id', auth(), requireModule('agendamentos'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { clientId, serviceId, startTime, endTime, status, notes } = req.body

    const current = await prisma.appointment.findUnique({ where: { id } });
    if (!current) return res.status(404).json(createErrorResponse('Agendamento não encontrado', 404));

    // Verificar se o usuário tem permissão sobre este profissional
    let canEdit = false;
    if (req.user?.type === 'profissional' && current.professionalId === req.user.id) {
      canEdit = true;
    } else if (req.user?.type === 'usuario') {
      const empresa = await prisma.empresa.findUnique({ where: { id: req.user.companyId! } });
      if (empresa?.ownerId === current.professionalId) {
        canEdit = true;
      }
    }

    if (!canEdit) return res.status(403).json(createErrorResponse('Acesso negado', 403));

    // Overbooking Validation
    const conflicting = await prisma.appointment.findFirst({
      where: {
        professionalId: current.professionalId,
        id: { not: id },
        status: { not: 'cancelado' },
        AND: [
          { startTime: { lt: new Date(endTime) } },
          { endTime: { gt: new Date(startTime) } }
        ]
      }
    });

    if (conflicting) {
      return res.status(409).json(createErrorResponse('Este horário já está ocupado.', 409));
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { 
        clientId: clientId ? Number(clientId) : undefined, 
        serviceId: serviceId ? Number(serviceId) : undefined, 
        startTime: startTime ? new Date(startTime) : undefined, 
        endTime: endTime ? new Date(endTime) : undefined, 
        status, 
        notes 
      },
      include: { lead: true }
    })
  
  if (req.user?.type === 'profissional') {
    logAudit(req.user.id, 'ATUALIZAR_AGENDAMENTO', 'Appointment', id)
  }

  // Update Lead's isScheduled status and auto-transition status if concluded
  if (updated.leadId) {
    const leadUpdateData: any = { isScheduled: true };
    
    // REGRA: Se a consulta foi concluída (Compareceu), move o lead para "Consulta Feita"
    if (status === 'concluido') {
      leadUpdateData.status = 'comercial_consult';
    }
    
    await prisma.lead.update({ 
      where: { id: updated.leadId }, 
      data: leadUpdateData 
    });
  }
  
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Appointments] Erro ao atualizar agendamento:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar agendamento', 500))
  }
})

router.delete('/:id', auth(), requireModule('agendamentos'), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.appointment.delete({ where: { id } })
  
  if (req.user?.type === 'profissional') {
    logAudit(req.user.id, 'DELETAR_AGENDAMENTO', 'Appointment', id)
  }
  
  res.json(createSuccessResponse({ id }))
})


