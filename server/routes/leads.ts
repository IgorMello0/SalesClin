import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { logAudit } from '../utils/audit.js'

export const router = Router()

// Listar todos os leads
router.get('/', auth(false), async (req, res) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query)
    const { search, status, professionalId } = req.query as any
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (status) {
      where.status = status
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        include: {
          activities: { orderBy: { createdAt: 'asc' } },
          proposals: { orderBy: { createdAt: 'desc' }, include: { specialist: true, salesperson: true } },
          appointments: { orderBy: { startTime: 'desc' }, take: 1 }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.lead.count({ where })
    ])
    res.json(createSuccessResponse(items, { page, pageSize, total }))
  } catch (error: any) {
    console.error('[Leads] Erro ao buscar leads:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar leads', 500))
  }
})

// Buscar lead por ID
router.get('/:id', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const item = await prisma.lead.findUnique({
      where: { id },
      include: {
        activities: { orderBy: { createdAt: 'asc' } },
        proposals: { orderBy: { createdAt: 'desc' }, include: { specialist: true, salesperson: true } }
      }
    })
    if (!item) return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    res.json(createSuccessResponse(item))
  } catch (error: any) {
    console.error('[Leads] Erro ao buscar lead:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar lead', 500))
  }
})

// Criar novo lead
router.post('/', auth(), async (req, res) => {
  try {
    const { name, value, origin, status, avatar, phone, email, notes, responsible, tags } = req.body
    
    if (!name) {
      return res.status(400).json(createErrorResponse('O nome é obrigatório', 400))
    }

    let professionalId: number;

    if (req.user?.type === 'profissional') {
      professionalId = req.user.id;
    } else if (req.user?.type === 'usuario') {
      // Buscar o dono da empresa do usuário
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
    
    const created = await prisma.lead.create({
      data: { 
        professionalId, 
        companyId: req.user.companyId,
        name, 
        value: Number(value) || 0, 
        origin, 
        status, 
        avatar, 
        phone, 
        email, 
        notes, 
        responsible,
        tags: tags || [] 
      }
    })
    
    logAudit(req.user.id, 'CRIAR_LEAD', 'Lead', created.id)
    
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Leads] Erro ao criar lead:', error)
    if (error.code === 'P2002') {
      return res.status(400).json(createErrorResponse('Já existe um lead com este número de telefone nesta clínica.', 400))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar lead', 500))
  }
})

// Adicionar Atividade ao Lead
router.post('/:id/activities', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { type, content, createdBy } = req.body
    
    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        type,
        content,
        createdBy
      }
    })
    
    res.status(201).json(createSuccessResponse(activity))
  } catch (error: any) {
    console.error('[Leads] Erro ao criar atividade:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar atividade', 500))
  }
})

// Atualizar Atividade do Lead
router.put('/:id/activities/:activityId', auth(), async (req, res) => {
  try {
    const activityId = Number(req.params.activityId)
    const { content } = req.body
    
    const updated = await prisma.leadActivity.update({
      where: { id: activityId },
      data: { content }
    })
    
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Leads] Erro ao atualizar atividade:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar atividade', 500))
  }
})

// Deletar Atividade do Lead
router.delete('/:id/activities/:activityId', auth(), async (req, res) => {
  try {
    const activityId = Number(req.params.activityId)
    await prisma.leadActivity.delete({
      where: { id: activityId }
    })
    res.json(createSuccessResponse({ id: activityId }))
  } catch (error: any) {
    console.error('[Leads] Erro ao deletar atividade:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao deletar atividade', 500))
  }
})

// Listar Propostas do Lead
router.get('/:id/proposals', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const proposals = await prisma.proposal.findMany({
      where: { leadId: id },
      include: {
        specialist: true,
        salesperson: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(createSuccessResponse(proposals))
  } catch (error: any) {
    console.error('[Leads] Erro ao buscar propostas:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar propostas', 500))
  }
})

// Adicionar Proposta ao Lead
router.post('/:id/proposals', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { title, value, validUntil, salespersonId, specialistId, tags, justification, discountApplied } = req.body
    
    const proposal = await prisma.proposal.create({
      data: {
        leadId: id,
        title,
        value: Number(value) || 0,
        validUntil: new Date(validUntil),
        salespersonId: salespersonId ? Number(salespersonId) : null,
        specialistId: specialistId ? Number(specialistId) : null,
        tags: tags || [],
        justification,
        discountApplied: Boolean(discountApplied)
      }
    })
    
    res.status(201).json(createSuccessResponse(proposal))
  } catch (error: any) {
    console.error('[Leads] Erro ao criar proposta:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar proposta', 500))
  }
})

// Atualizar lead
router.put('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = req.body

    // Map snake_case to camelCase if needed for Prisma
    const prismaData: any = { ...data }
    if (data.professional_id) {
      prismaData.professionalId = Number(data.professional_id)
      delete prismaData.professional_id
    }
    if (data.is_scheduled !== undefined) {
      prismaData.isScheduled = Boolean(data.is_scheduled)
      delete prismaData.is_scheduled
    }
    if (data.value !== undefined) prismaData.value = Number(data.value)
    if (data.isPaid !== undefined) {
      prismaData.isPaid = Boolean(data.isPaid)
    }
    if (data.discount_applied !== undefined) {
      prismaData.discountApplied = Boolean(data.discount_applied)
      delete prismaData.discount_applied
    }
    if (data.remarketing_proposals !== undefined) {
      prismaData.remarketingProposals = data.remarketing_proposals
      delete prismaData.remarketing_proposals
    }

    // Buscar lead atual para verificar se já foi convertido
    const currentLead = await prisma.lead.findUnique({ where: { id } })
    if (!currentLead) {
      return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    }

    // Conversão automática: quando status muda para 'comercial_closed' OU quando há propostas de remarketing (fechamento parcial)
    const isClosing = prismaData.status === 'comercial_closed' && currentLead.status !== 'comercial_closed'
    const isPartialClosing = prismaData.remarketingProposals !== undefined
    const alreadyConverted = !!currentLead.convertedToClientId

    if ((isClosing || isPartialClosing) && !alreadyConverted) {
      // Criar cliente automaticamente a partir dos dados do lead
      const newClient = await prisma.client.create({
        data: {
          professionalId: currentLead.professionalId,
          companyId: currentLead.companyId,
          name: currentLead.name,
          email: currentLead.email || null,
          phone: currentLead.phone || null,
          notes: currentLead.notes || null,
          avatar: currentLead.avatar || null,
        }
      })

      // Atualizar lead com referência ao cliente criado
      prismaData.convertedToClientId = newClient.id
      prismaData.convertedAt = new Date()

      console.log(`[Leads] Lead #${id} convertido automaticamente para Cliente #${newClient.id}`)

      const updated = await prisma.lead.update({
        where: { id },
        data: prismaData
      })
      
      if (req.user?.type === 'profissional') {
        logAudit(req.user.id, 'CONVERTER_LEAD_EM_CLIENTE', 'Lead', id)
      }

      return res.json(createSuccessResponse({
        ...updated,
        converted: true,
        convertedClient: newClient
      }))
    }
    
    const updated = await prisma.lead.update({
      where: { id },
      data: prismaData
    })
    
    if (req.user?.type === 'profissional') {
      logAudit(req.user.id, 'ATUALIZAR_LEAD', 'Lead', id)
    }
    
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Leads] Erro ao atualizar lead:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar lead', 500))
  }
})

// Confirm payment logic
router.post('/:id/confirm-payment', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { payments, proposalId } = req.body // Array of { amount, date, method, status } + optional proposalId

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return res.status(404).json(createErrorResponse('Lead não encontrado', 404))

    let clientId = lead.convertedToClientId

    // Se o lead ainda não foi convertido, criar cliente
    if (!clientId) {
      const newClient = await prisma.client.create({
        data: {
          professionalId: lead.professionalId,
          companyId: lead.companyId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          notes: lead.notes,
        }
      })
      clientId = newClient.id

      await prisma.lead.update({
        where: { id },
        data: { 
          convertedToClientId: clientId,
          convertedAt: new Date()
        }
      })
    }

    // Criar os pagamentos no banco de dados
    const paymentRecords = []
    for (const p of payments) {
      const payment = await prisma.payment.create({
        data: {
          clientId: clientId,
          professionalId: lead.professionalId,
          amount: p.amount,
          date: new Date(p.date),
          method: p.method, // 'cartao', 'pix', 'transferencia', 'dinheiro'
          status: p.status || 'pago'
        }
      })
      paymentRecords.push(payment)
    }

    // Se uma proposta foi vinculada, marcar como aceita
    if (proposalId) {
      await prisma.proposal.update({
        where: { id: Number(proposalId) },
        data: { status: 'accepted' }
      })
    }

    // Atualiza status do Lead para pago e move para o funil pós-venda ou similar se quiser
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { isPaid: true } // Mantendo o status onde está, apenas marcando como pago
    })

    res.json(createSuccessResponse({ payments: paymentRecords, lead: updatedLead }))
  } catch (error: any) {
    console.error('[Leads] Erro ao confirmar pagamento:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao confirmar pagamento', 500))
  }
})

// Deletar lead
router.delete('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.lead.delete({ where: { id } })
    
    if (req.user?.type === 'profissional') {
      logAudit(req.user.id, 'DELETAR_LEAD', 'Lead', id)
    }
    
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Leads] Erro ao deletar lead:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Lead não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao deletar lead', 500))
  }
})
