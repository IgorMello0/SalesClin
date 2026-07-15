import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { sendUazapiRequest } from '../services/uazapi-whatsapp.js'

export const router = Router()

function getCompanyId(req: any) {
  return Number(req.user?.companyId) || null
}

function normalizePhone(value?: string | null) {
  return String(value || '').replace(/\D/g, '')
}

const META_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

function getMetaWindow(messages: Array<{ sender: string; createdAt: Date }>, provider?: string | null) {
  if (provider !== 'meta') return { isOfficial: false, isOpen: true, expiresAt: null, remainingSeconds: null }
  const lastIncoming = [...messages].reverse().find((message) => message.sender === 'cliente')
  if (!lastIncoming) return { isOfficial: true, isOpen: false, expiresAt: null, remainingSeconds: 0 }
  const expiresAt = new Date(lastIncoming.createdAt.getTime() + META_SERVICE_WINDOW_MS)
  const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  return { isOfficial: true, isOpen: remainingSeconds > 0, expiresAt, remainingSeconds }
}

function withConversationState(item: any) {
  return {
    ...item,
    whatsappProvider: item.company?.whatsappProvider || null,
    serviceWindow: getMetaWindow(item.mensagens || [], item.company?.whatsappProvider),
    company: undefined,
  }
}

router.get('/', auth(), requireModule('conversas'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { agentId, clientId, leadId } = req.query as any
  
  const companyId = getCompanyId(req)

  if (!companyId) {
    return res.json(createSuccessResponse([], { page, pageSize, total: 0 }));
  }

  const where: any = { companyId };
  if (agentId) where.agentId = Number(agentId)
  if (clientId) where.clientId = Number(clientId)
  if (leadId) where.leadId = Number(leadId)

  const [items, total] = await Promise.all([
    prisma.conversa.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        agent: true,
        client: true,
        lead: true,
        professional: true,
        mensagens: { orderBy: { createdAt: 'asc' } },
        company: { select: { whatsappProvider: true } },
      }
    }),
    prisma.conversa.count({ where })
  ])
  res.json(createSuccessResponse(items.map(withConversationState), { page, pageSize, total }))
})

router.get('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const companyId = getCompanyId(req)
  if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))

  const item = await prisma.conversa.findFirst({
    where: { id, companyId },
    include: {
      agent: true,
      client: true,
      lead: true,
      professional: true,
      mensagens: { orderBy: { createdAt: 'asc' } },
      company: { select: { whatsappProvider: true } },
    }
  })
  if (!item) return res.status(404).json(createErrorResponse('Conversa não encontrada', 404))
  res.json(createSuccessResponse(withConversationState(item)))
})

router.post('/:id/messages', auth(), requireModule('conversas'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const companyId = getCompanyId(req)
    const content = String(req.body?.content || '').trim()
    const mediaUrl = String(req.body?.mediaUrl || '').trim()
    const mediaType = String(req.body?.mediaType || '').trim().toLowerCase()
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    if (!content && !mediaUrl) return res.status(400).json(createErrorResponse('Digite uma mensagem ou selecione uma midia', 400))
    if (content.length > 4096) return res.status(400).json(createErrorResponse('Mensagem muito longa', 400))
    if (mediaUrl && !['image', 'video', 'audio'].includes(mediaType)) {
      return res.status(400).json(createErrorResponse('Tipo de midia nao suportado', 400))
    }

    const conversation = await prisma.conversa.findFirst({
      where: { id, companyId },
      include: {
        lead: { select: { phone: true } },
        client: { select: { phone: true } },
        company: {
          select: {
            whatsappProvider: true,
            uazapiToken: true,
            metaToken: true,
            metaPhoneNumberId: true,
          },
        },
      },
    })
    if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))

    const phone = normalizePhone(conversation.phone || conversation.lead?.phone || conversation.client?.phone)
    if (!phone) return res.status(400).json(createErrorResponse('Conversa sem telefone valido', 400))

    const provider = conversation.company.whatsappProvider
    let providerMessageId: string | null = null
    let origin = 'WhatsApp'

    if (provider === 'uazapi') {
      const baseUrl = process.env.UAZAPI_API_URL || process.env.UAZAPI_BASE_URL
      if (!baseUrl || !conversation.company.uazapiToken) {
        return res.status(409).json(createErrorResponse('WhatsApp nao conectado nesta clinica', 409))
      }

      const result = await sendUazapiRequest({
        baseUrl,
        token: conversation.company.uazapiToken,
        path: mediaUrl ? '/send/media' : '/send/text',
        body: mediaUrl
          ? { number: phone, type: mediaType, file: mediaUrl, text: content }
          : { number: phone, text: content, linkPreview: false },
      })
      if (!result.response.ok) {
        const message = result.data?.message || result.data?.error || result.text || `HTTP ${result.response.status}`
        return res.status(502).json(createErrorResponse(`Falha ao enviar pelo WhatsApp: ${String(message).replace(/UAZAPI/gi, 'servico')}`, 502))
      }
      providerMessageId = result.data?.messageid || result.data?.messageId || result.data?.id || null
      origin = 'WhatsApp'
    } else if (provider === 'meta') {
      if (!conversation.company.metaToken || !conversation.company.metaPhoneNumberId) {
        return res.status(409).json(createErrorResponse('WhatsApp Oficial nao conectado nesta clinica', 409))
      }

      const lastIncoming = await prisma.mensagem.findFirst({
        where: { conversationId: conversation.id, sender: 'cliente' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      const windowOpen = lastIncoming && Date.now() - lastIncoming.createdAt.getTime() < META_SERVICE_WINDOW_MS
      if (!windowOpen) {
        return res.status(409).json(createErrorResponse(
          'A janela de 24 horas da Meta encerrou. Envie um template aprovado para reabrir o atendimento.',
          409,
        ))
      }

      const response = await fetch(`https://graph.facebook.com/v19.0/${conversation.company.metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conversation.company.metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mediaUrl ? {
          messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: mediaType,
          [mediaType]: { link: mediaUrl, ...(content && mediaType !== 'audio' ? { caption: content } : {}) },
        } : {
          messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text',
          text: { preview_url: false, body: content },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = payload?.error?.message || `HTTP ${response.status}`
        return res.status(502).json(createErrorResponse(`Meta: ${message}`, 502))
      }
      providerMessageId = payload?.messages?.[0]?.id || null
      origin = 'WhatsApp Meta'
    } else {
      return res.status(409).json(createErrorResponse('Conecte uma integracao WhatsApp antes de enviar mensagens', 409))
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.mensagem.create({
        data: {
          conversationId: conversation.id,
          sender: 'profissional',
          content: content || `[${mediaType}]`,
          providerMessageId,
          origin,
          rawJson: mediaUrl ? { mediaUrl, mediaType } : undefined,
        },
      })
      await tx.conversa.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })
      return created
    })

    return res.status(201).json(createSuccessResponse(message))
  } catch (error: any) {
    console.error('[Conversas] Erro ao enviar mensagem:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao enviar mensagem', 500))
  }
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

router.put('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const companyId = getCompanyId(req)
  const existing = await prisma.conversa.findFirst({ where: { id, companyId: companyId || -1 }, select: { id: true } })
  if (!existing) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))
  const { agentId, clientId, professionalId, app, channel } = req.body
  if (agentId) {
    const agent = await prisma.agenteIa.findFirst({ where: { id: Number(agentId), companyId: companyId || -1 } })
    if (!agent) return res.status(400).json(createErrorResponse('Agente IA nao pertence a esta clinica', 400))
  }
  const updated = await prisma.conversa.update({ where: { id }, data: { agentId, clientId, professionalId, app, channel } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const companyId = getCompanyId(req)
  const existing = await prisma.conversa.findFirst({ where: { id, companyId: companyId || -1 }, select: { id: true } })
  if (!existing) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))
  await prisma.conversa.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})
