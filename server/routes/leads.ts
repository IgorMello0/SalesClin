import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { logAudit } from '../utils/audit.js'

export const router = Router()

const PAYMENT_METHOD_ALIASES: Record<string, 'pix' | 'cartao' | 'dinheiro' | 'transferencia'> = {
  pix: 'pix',
  cartao: 'cartao',
  credito: 'cartao',
  debito: 'cartao',
  dinheiro: 'dinheiro',
  transferencia: 'transferencia',
  boleto: 'transferencia',
}

const PAYMENT_STATUS_ALIASES: Record<string, 'pago' | 'pendente' | 'atrasado' | 'cancelado'> = {
  pago: 'pago',
  paid: 'pago',
  pendente: 'pendente',
  pending: 'pendente',
  atrasado: 'atrasado',
  overdue: 'atrasado',
  cancelado: 'cancelado',
  canceled: 'cancelado',
  cancelled: 'cancelado',
}

// Listar todos os leads
router.get('/', auth(false), async (req, res) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query)
    const { search, status, professionalId } = req.query as any
    let companyId = req.user?.companyId;

    if (req.user?.type === 'profissional' && !companyId) {
      const prof = await prisma.professional.findUnique({
        where: { id: req.user.id },
        select: { companyId: true }
      });
      companyId = prof?.companyId || undefined;
    }

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Clínica não identificada.', 400));
    }

    const where: any = { companyId: companyId };

    // Regra de Visibilidade de Leads
    if (req.user?.type === 'usuario') {
      const dbUser = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        include: { role: true }
      });
      if (dbUser?.role && !dbUser.role.isAdmin && !dbUser.role.isManager) {
        // Se não for Admin nem Gestor Comercial, só vê leads atribuídos a si mesmo (como SDR ou Closer)
        // OU leads antigos que ainda não possuem nenhuma atribuição
        where.AND = [
          {
            OR: [
              { sdrId: req.user.id },
              { closerId: req.user.id },
              { sdrId: null, closerId: null }
            ]
          }
        ];
      }
    }

    if (search) {
      const searchStr = String(search);
      const numericSearch = searchStr.replace(/\D/g, '');
      
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { phone: { contains: searchStr, mode: 'insensitive' } }
      ]
      
      if (numericSearch.length > 0) {
        where.OR.push({ phone: { contains: numericSearch } });
      }
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

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    if (_companyId && item.companyId && item.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }
    
    res.json(createSuccessResponse(item))
  } catch (error: any) {
    console.error('[Leads] Erro ao buscar lead:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar lead', 500))
  }
})

// Criar novo lead
router.post('/', auth(), async (req, res) => {
  try {
    let { name, value, origin, status, avatar, phone, email, notes, responsible, tags, sdrId: requestedSdrId } = req.body
    
    if (!name) {
      return res.status(400).json(createErrorResponse('O nome é obrigatório', 400))
    }

    if (phone) {
      phone = String(phone).replace(/\D/g, '');
    }

    let professionalId: number;
    let companyId = req.user?.companyId || null;

    if (req.user?.type === 'profissional') {
      professionalId = req.user.id;
      if (!companyId) {
        const professional = await prisma.professional.findUnique({
          where: { id: req.user.id },
          select: { companyId: true },
        });
        companyId = professional?.companyId || null;
      }
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
    
    let sdrId: number | undefined = undefined;
    let closerId: number | undefined = undefined;

    // Se a interface enviar o SDR (pode ser um ID numérico, null para forçar nenhum, ou undefined/'random')
    if (requestedSdrId === 'random') {
      sdrId = undefined; // Força a roleta
    } else if (requestedSdrId !== undefined) {
      sdrId = requestedSdrId === null ? undefined : Number(requestedSdrId);
    }

    // Verificar se o criador do lead é SDR ou Closer e o SDR não foi explicitamente definido no request
    if (req.user?.type === 'usuario' && req.user?.id) {
      const criador = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        include: { role: true }
      });
      if (criador?.role) {
        if (criador.role.isSDR && requestedSdrId === undefined) sdrId = req.user.id;
        if (criador.role.isCloser) closerId = req.user.id;
      }
    }
    
    // Roteamento Automático de SDRs (apenas se quem criou NÃO for um SDR)
    if (!sdrId && companyId) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: companyId },
        select: { leadRoutingMode: true }
      });

      if (empresa && empresa.leadRoutingMode !== 'manual') {
        const sdrs = await prisma.usuario.findMany({
          where: {
            companyId,
            isActive: true,
            role: { isSDR: true }
          },
          select: { id: true, leadRoutingWeight: true }
        });

        if (sdrs.length > 0) {
          if (empresa.leadRoutingMode === 'automatic_equal') {
            // Distribuição uniforme (Roleta randomizada)
            const randomIndex = Math.floor(Math.random() * sdrs.length);
            sdrId = sdrs[randomIndex].id;
          } else if (empresa.leadRoutingMode === 'semi_automatic') {
            // Distribuição ponderada (Pesos customizados)
            const totalWeight = sdrs.reduce((acc, sdr) => acc + (sdr.leadRoutingWeight || 1), 0);
            let random = Math.random() * totalWeight;
            for (const sdr of sdrs) {
              random -= (sdr.leadRoutingWeight || 1);
              if (random <= 0) {
                sdrId = sdr.id;
                break;
              }
            }
            if (!sdrId) sdrId = sdrs[sdrs.length - 1].id;
          }
        }
      }
    }

    if (phone) {
      const existingLead = await prisma.lead.findFirst({
        where: { phone, companyId },
        select: { id: true, name: true },
      });

      if (existingLead) {
        return res.status(409).json(createErrorResponse(
          `Este telefone ja pertence ao lead ${existingLead.name} (ID ${existingLead.id}).`,
          409
        ));
      }
    }

    const created = await prisma.lead.create({
      data: { 
        professionalId, 
        companyId,
        sdrId,
        closerId,
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
    
    if (sdrId) {
      const assignedSdr = await prisma.usuario.findUnique({ where: { id: sdrId }, select: { name: true }});
      if (assignedSdr) {
        let actCreator = 'Sistema';
        if (req.user?.type === 'usuario') {
          const u = await prisma.usuario.findUnique({ where: { id: req.user.id }, select: { name: true }});
          if (u) actCreator = u.name;
        } else if (req.user?.type === 'profissional') {
          const p = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { name: true }});
          if (p) actCreator = p.name;
        }
        
        await prisma.leadActivity.create({
          data: { 
            leadId: created.id, 
            type: 'system', 
            content: `O lead foi atribuído para o SDR ${assignedSdr.name}.`,
            createdBy: actCreator 
          }
        });
      }
    }
    
    logAudit(req.user, 'CRIAR_LEAD', 'Lead', created.id)
    
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

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

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

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

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

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

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

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

    const { title, value, validUntil, salespersonId, specialistId, sdrId, tags, justification, discountApplied } = req.body
    
    const proposal = await prisma.proposal.create({
      data: {
        leadId: id,
        title,
        value: Number(value) || 0,
        validUntil: new Date(validUntil),
        salespersonId: salespersonId ? Number(salespersonId) : null,
        specialistId: specialistId ? Number(specialistId) : null,
        sdrId: sdrId ? Number(sdrId) : null,
        tags: tags || [],
        justification,
        discountApplied: Boolean(discountApplied)
      }
    })
    
    await prisma.lead.update({
      where: { id },
      data: { value: Number(value) || 0 }
    })
    
    res.status(201).json(createSuccessResponse(proposal))
  } catch (error: any) {
    console.error('[Leads] Erro ao criar proposta:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar proposta', 500))
  }
})

// Atualizar Proposta do Lead
router.put('/:id/proposals/:proposalId', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

    const proposalId = Number(req.params.proposalId)
    const { title, value, validUntil, salespersonId, specialistId, sdrId, tags, justification, discountApplied, stage, status } = req.body
    
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (value !== undefined) updateData.value = Number(value) || 0
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil)
    if (salespersonId !== undefined) updateData.salespersonId = salespersonId ? Number(salespersonId) : null
    if (specialistId !== undefined) updateData.specialistId = specialistId ? Number(specialistId) : null
    if (sdrId !== undefined) updateData.sdrId = sdrId ? Number(sdrId) : null
    if (tags !== undefined) updateData.tags = tags
    if (justification !== undefined) updateData.justification = justification
    if (discountApplied !== undefined) updateData.discountApplied = Boolean(discountApplied)
    if (stage !== undefined || status !== undefined) {
      updateData.status = stage || status
    }

    const proposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: updateData
    })
    
    if (value !== undefined) {
      await prisma.lead.update({
        where: { id },
        data: { value: Number(value) || 0 }
      })
    }
    
    res.json(createSuccessResponse(proposal))
  } catch (error: any) {
    console.error('[Leads] Erro ao atualizar proposta:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar proposta', 500))
  }
})


// Atualizar lead
router.put('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

    const data = req.body

    // Map snake_case to camelCase if needed for Prisma
    const prismaData: any = { ...data }
    if (data.professional_id) {
      prismaData.professionalId = Number(data.professional_id)
      delete prismaData.professional_id
    }
    if (prismaData.phone) {
      prismaData.phone = String(prismaData.phone).replace(/\D/g, '');
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

    // Regra de Negócio: Cancelamento/Rollback automático ao voltar estágio
    if (prismaData.status && prismaData.status !== currentLead.status) {
      const newStatus = prismaData.status;

      // 1. Se voltou para antes de Agendados (Novos Leads ou Qualificados)
      if (newStatus === 'prospect_lead' || newStatus === 'prospect_qualified') {
        // Cancelar todos os agendamentos ativos/confirmados deste lead
        await prisma.appointment.updateMany({
          where: { 
            leadId: id,
            status: { in: ['agendado', 'confirmado'] }
          },
          data: { status: 'cancelado' }
        });
        prismaData.isScheduled = false;
      }

      // 2. Se voltou para antes de Proposta (Novos Leads, Qualificados, Agendados, Consulta Feita)
      const beforeProposalStatuses = ['prospect_lead', 'prospect_qualified', 'prospect_scheduled', 'prospect_attended'];
      if (beforeProposalStatuses.includes(newStatus)) {
        // Cancelar todas as propostas pendentes/ativas do lead
        await prisma.proposal.updateMany({
          where: {
            leadId: id,
            status: 'pending'
          },
          data: { status: 'rejected' }
        });
      }

      // 3. Se voltou para antes de Fechado (Comercial ou Prospecção)
      const beforeClosedStatuses = [
        'prospect_lead', 'prospect_qualified', 'prospect_scheduled',
        'prospect_attended', 'comercial_proposal', 'comercial_follow'
      ];
      if (beforeClosedStatuses.includes(newStatus)) {
        // Resetar o estado de conversão do lead para que possa ser convertido novamente
        prismaData.convertedToClientId = null;
        prismaData.convertedAt = null;
        prismaData.isPaid = false; // resetar flag de pago
      }
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

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

    const { payments, proposalId } = req.body // Array of { amount, date, method, status } + optional proposalId

    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json(createErrorResponse('Informe ao menos um pagamento.', 400))
    }

    const normalizedPayments = payments.map((payment: any) => ({
      ...payment,
      amount: Number(payment.amount),
      date: new Date(payment.date),
      method: PAYMENT_METHOD_ALIASES[String(payment.method || '').trim().toLowerCase()],
      status: PAYMENT_STATUS_ALIASES[String(payment.status || 'pago').trim().toLowerCase()],
    }))

    const invalidPayment = normalizedPayments.find((payment: any) => (
      !Number.isFinite(payment.amount)
      || payment.amount <= 0
      || !payment.method
      || !payment.status
      || Number.isNaN(payment.date.getTime())
    ))

    if (invalidPayment) {
      return res.status(400).json(createErrorResponse('Pagamento invalido. Confira valor, data e metodo.', 400))
    }

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
          avatar: lead.avatar || null,
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
    for (const p of normalizedPayments) {
      const payment = await prisma.payment.create({
        data: {
          clientId: clientId,
          professionalId: lead.professionalId,
          companyId: lead.companyId,
          amount: p.amount,
          date: p.date,
          method: p.method,
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
      data: { 
        isPaid: true,
        status: 'comercial_closed' // Garantir que não volte pra trás devido a race condition do drag and drop
      } 
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

    let _companyId = req.user?.companyId;
    if (req.user?.type === 'profissional' && !_companyId) {
      const _prof = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { companyId: true } });
      _companyId = _prof?.companyId || undefined;
    }
    const _checkEntity = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, select: { companyId: true, professionalId: true } });
    if (!_checkEntity) return res.status(404).json(createErrorResponse('lead não encontrado', 404));
    if (_companyId && _checkEntity.companyId !== _companyId) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    } else if (!_companyId && req.user?.id && _checkEntity.professionalId !== req.user.id) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

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

// Atualizar atribuição de equipe (SDR/Closer)
router.patch('/:id/assignment', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { sdrId, closerId } = req.body;
    
    const lead = await prisma.lead.findUnique({ where: { id: parseInt(id) } });
    if (!lead) return res.status(404).json(createErrorResponse('Lead não encontrado', 404));

    const updated = await prisma.lead.update({
      where: { id: parseInt(id) },
      data: {
        ...(sdrId !== undefined && { sdrId: sdrId === null ? null : parseInt(sdrId) }),
        ...(closerId !== undefined && { closerId: closerId === null ? null : parseInt(closerId) })
      },
      include: {
        sdr: { select: { name: true } },
        closer: { select: { name: true } }
      }
    });

    let userName = 'Sistema';
    if (req.user?.type === 'usuario') {
      const u = await prisma.usuario.findUnique({ where: { id: req.user.id }, select: { name: true }});
      if (u) userName = u.name;
    } else if (req.user?.type === 'profissional') {
      const p = await prisma.professional.findUnique({ where: { id: req.user.id }, select: { name: true }});
      if (p) userName = p.name;
    }

    if (sdrId !== undefined) {
      const parsedSdr = sdrId === null ? null : parseInt(sdrId);
      if (lead.sdrId !== parsedSdr) {
        const content = parsedSdr === null ? 'SDR responsável removido.' : `O SDR responsável foi alterado para ${updated.sdr?.name || 'outro usuário'}.`;
        await prisma.leadActivity.create({
          data: { leadId: updated.id, type: 'system', content, createdBy: userName }
        });
      }
    }

    if (closerId !== undefined) {
      const parsedCloser = closerId === null ? null : parseInt(closerId);
      if (lead.closerId !== parsedCloser) {
        const content = parsedCloser === null ? 'Closer responsável removido.' : `O Closer responsável foi alterado para ${updated.closer?.name || 'outro usuário'}.`;
        await prisma.leadActivity.create({
          data: { leadId: updated.id, type: 'system', content, createdBy: userName }
        });
      }
    }

    logAudit(req.user!, 'ATUALIZAR_EQUIPE_LEAD', 'Lead', updated.id);
    res.json(createSuccessResponse(updated));
  } catch (error: any) {
    console.error('[Leads] Erro ao reatribuir equipe:', error);
    res.status(500).json(createErrorResponse('Erro ao reatribuir equipe', 500));
  }
});
