import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { sendUazapiRequest } from '../services/uazapi-whatsapp.js'
import { sendMetaTemplateMessage } from '../services/whatsapp-messages.js'

export const router = Router()

function getCompanyId(req: any) {
  return Number(req.user?.companyId) || null
}

function getActor(req: any) {
  return req.user?.type === 'profissional'
    ? { actorProfessionalId: Number(req.user.id), actorUserId: null }
    : { actorProfessionalId: null, actorUserId: Number(req.user?.id) || null }
}

const conversationInclude = {
  agent: true,
  client: true,
  lead: true,
  professional: true,
  assignedProfessional: { select: { id: true, name: true, email: true } },
  assignedUser: { select: { id: true, name: true, email: true } },
  labels: { include: { label: true } },
  mensagens: { orderBy: { createdAt: 'asc' as const } },
  company: { select: { whatsappProvider: true } },
}

function normalizePhone(value?: string | null) {
  return String(value || '').replace(/\D/g, '')
}

const META_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

function getMimeTypeFromUrl(url: string, mediaType: string) {
  const cleanUrl = url.split('?')[0]?.toLowerCase() || ''
  if (cleanUrl.endsWith('.ogg')) return 'audio/ogg'
  if (cleanUrl.endsWith('.opus')) return 'audio/ogg'
  if (cleanUrl.endsWith('.mp3')) return 'audio/mpeg'
  if (cleanUrl.endsWith('.m4a')) return 'audio/mp4'
  if (cleanUrl.endsWith('.mp4')) return mediaType === 'audio' ? 'audio/mp4' : 'video/mp4'
  if (cleanUrl.endsWith('.3gp')) return 'video/3gpp'
  if (cleanUrl.endsWith('.webp')) return 'image/webp'
  if (cleanUrl.endsWith('.png')) return 'image/png'
  if (cleanUrl.endsWith('.gif')) return 'image/gif'
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg'
  if (mediaType === 'audio') return 'audio/ogg'
  if (mediaType === 'video') return 'video/mp4'
  return 'image/jpeg'
}

function getFileNameFromUrl(url: string, mediaType: string) {
  const pathname = new URL(url).pathname
  const filename = pathname.split('/').filter(Boolean).pop()
  if (filename && filename.includes('.')) return filename
  if (mediaType === 'audio') return 'audio.ogg'
  if (mediaType === 'video') return 'video.mp4'
  return 'imagem.jpg'
}

async function uploadMetaMediaFromUrl(input: {
  phoneNumberId: string
  token: string
  mediaUrl: string
  mediaType: string
}) {
  const source = await fetch(input.mediaUrl)
  if (!source.ok) {
    throw new Error(`Nao foi possivel ler a midia publica (${source.status}).`)
  }

  const contentType = input.mediaType === 'audio'
    ? 'audio/ogg'
    : source.headers.get('content-type')?.split(';')[0]?.trim()
      || getMimeTypeFromUrl(input.mediaUrl, input.mediaType)
  const buffer = await source.arrayBuffer()
  const form = new FormData()
  form.set('messaging_product', 'whatsapp')
  form.set('type', contentType)
  form.set('file', new Blob([Buffer.from(buffer) as any], { type: contentType }), getFileNameFromUrl(input.mediaUrl, input.mediaType))

  const response = await fetch(`https://graph.facebook.com/v19.0/${input.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.token}` },
    body: form,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error?.message || `Meta media upload HTTP ${response.status}`)
  }

  return String(payload.id)
}

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
    labels: Array.isArray(item.labels) ? item.labels.map((entry: any) => entry.label) : [],
    whatsappProvider: item.company?.whatsappProvider || null,
    serviceWindow: getMetaWindow(item.mensagens || [], item.company?.whatsappProvider),
    company: undefined,
  }
}

router.get('/', auth(), requireModule('conversas'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { agentId, clientId, leadId, status, assignment, labelId } = req.query as any
  
  const companyId = getCompanyId(req)

  if (!companyId) {
    return res.json(createSuccessResponse([], { page, pageSize, total: 0 }));
  }

  const where: any = { companyId };
  if (agentId) where.agentId = Number(agentId)
  if (clientId) where.clientId = Number(clientId)
  if (leadId) where.leadId = Number(leadId)
  if (status && ['OPEN', 'PENDING', 'RESOLVED'].includes(String(status).toUpperCase())) {
    where.status = String(status).toUpperCase()
  }
  if (labelId) where.labels = { some: { labelId: Number(labelId) } }
  if (assignment === 'unassigned') {
    where.assignedProfessionalId = null
    where.assignedUserId = null
  } else if (assignment === 'mine') {
    if (req.user?.type === 'profissional') where.assignedProfessionalId = Number(req.user.id)
    if (req.user?.type === 'usuario') where.assignedUserId = Number(req.user.id)
  }

  const [items, total] = await Promise.all([
    prisma.conversa.findMany({
      where,
      skip,
      take,
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      include: conversationInclude,
    }),
    prisma.conversa.count({ where })
  ])
  res.json(createSuccessResponse(items.map(withConversationState), { page, pageSize, total }))
})

router.get('/workspace', auth(), requireModule('conversas'), async (req, res) => {
  const companyId = getCompanyId(req)
  if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))

  const [company, labels, users] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: companyId },
      select: {
        owner: { select: { id: true, name: true, email: true } },
        professionals: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.conversationLabel.findMany({ where: { companyId }, orderBy: { name: 'asc' } }),
    prisma.usuario.findMany({
      where: {
        isActive: true,
        OR: [
          { companyId },
          { companyAccess: { some: { companyId, isActive: true } } },
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const professionals = [company?.owner, ...(company?.professionals || [])]
    .filter(Boolean)
    .filter((item, index, all) => all.findIndex((candidate) => candidate?.id === item?.id) === index)

  return res.json(createSuccessResponse({ labels, professionals, users }))
})

router.post('/labels', auth(), requireModule('conversas'), async (req, res) => {
  const companyId = getCompanyId(req)
  const name = String(req.body?.name || '').trim()
  const color = String(req.body?.color || '#64748b').trim()
  if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
  if (!name || name.length > 40) return res.status(400).json(createErrorResponse('Informe um nome de ate 40 caracteres', 400))
  if (!/^#[0-9a-f]{6}$/i.test(color)) return res.status(400).json(createErrorResponse('Cor invalida', 400))

  const label = await prisma.conversationLabel.upsert({
    where: { companyId_name: { companyId, name } },
    create: { companyId, name, color },
    update: { color },
  })
  return res.status(201).json(createSuccessResponse(label))
})

router.post('/:id/labels', auth(), requireModule('conversas'), async (req, res) => {
  const conversationId = Number(req.params.id)
  const labelId = Number(req.body?.labelId)
  const companyId = getCompanyId(req)
  const [conversation, label] = await Promise.all([
    prisma.conversa.findFirst({ where: { id: conversationId, companyId: companyId || -1 }, select: { id: true } }),
    prisma.conversationLabel.findFirst({ where: { id: labelId, companyId: companyId || -1 } }),
  ])
  if (!conversation || !label) return res.status(404).json(createErrorResponse('Conversa ou etiqueta nao encontrada', 404))

  await prisma.$transaction([
    prisma.conversationLabelLink.upsert({
      where: { conversationId_labelId: { conversationId, labelId } },
      create: { conversationId, labelId },
      update: {},
    }),
    prisma.conversationEvent.create({
      data: { conversationId, type: 'label_added', metadata: { labelId, name: label.name }, ...getActor(req) },
    }),
  ])
  return res.status(201).json(createSuccessResponse(label))
})

router.delete('/:id/labels/:labelId', auth(), requireModule('conversas'), async (req, res) => {
  const conversationId = Number(req.params.id)
  const labelId = Number(req.params.labelId)
  const companyId = getCompanyId(req)
  const conversation = await prisma.conversa.findFirst({ where: { id: conversationId, companyId: companyId || -1 }, select: { id: true } })
  if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))

  await prisma.$transaction([
    prisma.conversationLabelLink.deleteMany({ where: { conversationId, labelId } }),
    prisma.conversationEvent.create({ data: { conversationId, type: 'label_removed', metadata: { labelId }, ...getActor(req) } }),
  ])
  return res.json(createSuccessResponse({ conversationId, labelId }))
})

router.get('/:id/notes', auth(), requireModule('conversas'), async (req, res) => {
  const conversationId = Number(req.params.id)
  const companyId = getCompanyId(req)
  const conversation = await prisma.conversa.findFirst({ where: { id: conversationId, companyId: companyId || -1 }, select: { id: true } })
  if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))
  const notes = await prisma.conversationNote.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    include: {
      authorProfessional: { select: { id: true, name: true } },
      authorUser: { select: { id: true, name: true } },
    },
  })
  return res.json(createSuccessResponse(notes))
})

router.post('/:id/notes', auth(), requireModule('conversas'), async (req, res) => {
  const conversationId = Number(req.params.id)
  const companyId = getCompanyId(req)
  const content = String(req.body?.content || '').trim()
  if (!content || content.length > 2000) return res.status(400).json(createErrorResponse('A nota deve ter entre 1 e 2000 caracteres', 400))
  const conversation = await prisma.conversa.findFirst({ where: { id: conversationId, companyId: companyId || -1 }, select: { id: true } })
  if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))

  const actor = getActor(req)
  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.conversationNote.create({
      data: {
        conversationId,
        content,
        authorProfessionalId: actor.actorProfessionalId,
        authorUserId: actor.actorUserId,
      },
      include: {
        authorProfessional: { select: { id: true, name: true } },
        authorUser: { select: { id: true, name: true } },
      },
    })
    await tx.conversationEvent.create({ data: { conversationId, type: 'note_added', metadata: { noteId: created.id }, ...actor } })
    return created
  })
  return res.status(201).json(createSuccessResponse(note))
})

router.post('/:id/assign', auth(), requireModule('conversas'), async (req, res) => {
  const conversationId = Number(req.params.id)
  const companyId = getCompanyId(req)
  const assigneeType = req.body?.assigneeType ? String(req.body.assigneeType) : null
  const assigneeId = Number(req.body?.assigneeId) || null
  const conversation = await prisma.conversa.findFirst({ where: { id: conversationId, companyId: companyId || -1 }, select: { id: true } })
  if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))

  let assignedProfessionalId: number | null = null
  let assignedUserId: number | null = null
  if (assigneeType === 'professional' && assigneeId) {
    const professional = await prisma.professional.findFirst({
      where: { id: assigneeId, OR: [{ companyId }, { ownedCompanies: { some: { id: companyId || -1 } } }] },
      select: { id: true },
    })
    if (!professional) return res.status(400).json(createErrorResponse('Profissional nao pertence a esta clinica', 400))
    assignedProfessionalId = professional.id
  } else if (assigneeType === 'user' && assigneeId) {
    const user = await prisma.usuario.findFirst({
      where: { id: assigneeId, isActive: true, OR: [{ companyId }, { companyAccess: { some: { companyId: companyId || -1, isActive: true } } }] },
      select: { id: true },
    })
    if (!user) return res.status(400).json(createErrorResponse('Usuario nao pertence a esta clinica', 400))
    assignedUserId = user.id
  } else if (assigneeType !== null) {
    return res.status(400).json(createErrorResponse('Responsavel invalido', 400))
  }

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.conversa.update({
      where: { id: conversationId },
      data: { assignedProfessionalId, assignedUserId },
      include: conversationInclude,
    })
    await tx.conversationEvent.create({
      data: { conversationId, type: 'assignment_changed', metadata: { assigneeType, assigneeId }, ...getActor(req) },
    })
    return item
  })
  return res.json(createSuccessResponse(withConversationState(updated)))
})

router.post('/:id/status', auth(), requireModule('conversas'), async (req, res) => {
  const conversationId = Number(req.params.id)
  const companyId = getCompanyId(req)
  const status = String(req.body?.status || '').toUpperCase()
  if (!['OPEN', 'PENDING', 'RESOLVED'].includes(status)) return res.status(400).json(createErrorResponse('Status invalido', 400))
  const conversation = await prisma.conversa.findFirst({ where: { id: conversationId, companyId: companyId || -1 }, select: { id: true } })
  if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.conversa.update({
      where: { id: conversationId },
      data: { status: status as any, resolvedAt: status === 'RESOLVED' ? new Date() : null },
      include: conversationInclude,
    })
    await tx.conversationEvent.create({ data: { conversationId, type: 'status_changed', metadata: { status }, ...getActor(req) } })
    return item
  })
  return res.json(createSuccessResponse(withConversationState(updated)))
})

router.post('/:id/read', auth(), requireModule('conversas'), async (req, res) => {
  const conversationId = Number(req.params.id)
  const companyId = getCompanyId(req)
  const conversation = await prisma.conversa.findFirst({ where: { id: conversationId, companyId: companyId || -1 }, select: { id: true } })
  if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))
  await prisma.conversa.update({ where: { id: conversationId }, data: { unreadCount: 0 } })
  return res.json(createSuccessResponse({ id: conversationId, unreadCount: 0 }))
})

router.get('/:id', auth(), requireModule('conversas'), async (req, res) => {
  const id = Number(req.params.id)
  const companyId = getCompanyId(req)
  if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))

  const item = await prisma.conversa.findFirst({
    where: { id, companyId },
    include: conversationInclude,
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

      let result
      if (mediaUrl) {
        const mediaAttempts = mediaType === 'audio'
          ? [
              { number: phone, type: 'audio', file: mediaUrl, mimetype: 'audio/ogg' },
              { number: phone, type: 'audio', audio: mediaUrl, mimetype: 'audio/ogg' },
              { number: phone, mediatype: 'audio', media: mediaUrl, mimetype: 'audio/ogg' },
            ]
          : [{ number: phone, type: mediaType, file: mediaUrl, text: content }]

        for (const body of mediaAttempts) {
          result = await sendUazapiRequest({
            baseUrl,
            token: conversation.company.uazapiToken,
            path: '/send/media',
            body,
          })
          if (result.response.ok) break
        }
      } else {
        result = await sendUazapiRequest({
          baseUrl,
          token: conversation.company.uazapiToken,
          path: '/send/text',
          body: { number: phone, text: content, linkPreview: false },
        })
      }

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

      let uploadedMediaId: string | null = null
      if (mediaUrl) {
        try {
          uploadedMediaId = await uploadMetaMediaFromUrl({
            phoneNumberId: conversation.company.metaPhoneNumberId,
            token: conversation.company.metaToken,
            mediaUrl,
            mediaType,
          })
        } catch (uploadError) {
          console.warn('[Conversas] Meta media upload falhou, usando link direto:', uploadError)
        }
      }

      const mediaPayload = mediaUrl
        ? {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: mediaType,
            [mediaType]: {
              ...(uploadedMediaId ? { id: uploadedMediaId } : { link: mediaUrl }),
              ...(content && mediaType !== 'audio' ? { caption: content } : {}),
            },
          }
        : null

      const response = await fetch(`https://graph.facebook.com/v19.0/${conversation.company.metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conversation.company.metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mediaPayload || {
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
          deliveryStatus: 'sent',
          sentAt: new Date(),
          rawJson: mediaUrl ? { mediaUrl, mediaType } : undefined,
        },
      })
      await tx.conversa.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date(), lastMessageAt: new Date() },
      })
      return created
    })

    return res.status(201).json(createSuccessResponse(message))
  } catch (error: any) {
    console.error('[Conversas] Erro ao enviar mensagem:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao enviar mensagem', 500))
  }
})

router.post('/:id/templates', auth(), requireModule('conversas'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const companyId = getCompanyId(req)
    const templateId = Number(req.body?.templateId)
    const parameterValues = Array.isArray(req.body?.parameterValues)
      ? req.body.parameterValues.map((value: unknown) => String(value || ''))
      : []
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    if (!templateId) return res.status(400).json(createErrorResponse('Selecione um template aprovado', 400))

    const conversation = await prisma.conversa.findFirst({
      where: { id, companyId },
      include: {
        lead: { select: { name: true, phone: true } },
        client: { select: { name: true, phone: true } },
      },
    })
    if (!conversation) return res.status(404).json(createErrorResponse('Conversa nao encontrada', 404))

    const phone = normalizePhone(conversation.phone || conversation.lead?.phone || conversation.client?.phone)
    const name = conversation.client?.name || conversation.lead?.name || phone
    const sent = await sendMetaTemplateMessage({
      companyId,
      phone,
      templateId,
      parameterValues,
      variables: { nome: name, name, telefone: phone, phone },
      headerMediaUrl: String(req.body?.headerMediaUrl || '').trim() || undefined,
    })

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.mensagem.create({
        data: {
          conversationId: conversation.id,
          sender: 'profissional',
          content: `[Template: ${sent.template.name}]`,
          providerMessageId: sent.providerMessageId,
          origin: 'WhatsApp Meta Template',
          deliveryStatus: 'sent',
          sentAt: new Date(),
          rawJson: { templateId, templateName: sent.template.name, parameterValues },
        },
      })
      await tx.conversa.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date(), lastMessageAt: new Date() },
      })
      return created
    })

    return res.status(201).json(createSuccessResponse(message))
  } catch (error: any) {
    console.error('[Conversas] Erro ao enviar template:', error)
    return res.status(502).json(createErrorResponse(error.message || 'Erro ao enviar template', 502))
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
