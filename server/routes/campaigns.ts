import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

// ─── Helper: Resolve companyId & professionalId from JWT ───
function resolveIds(req: any) {
  let professionalId: number | undefined
  let companyId: number | undefined

  if (req.user?.type === 'profissional') {
    professionalId = req.user.id
    companyId = req.user.companyId
  } else if (req.user?.type === 'usuario') {
    companyId = req.user.companyId
  }

  return { professionalId, companyId }
}

// ─── Listar campanhas ───
router.get('/', auth(false), async (req, res) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query)
    const { companyId } = resolveIds(req)

    if (!companyId) {
      return res.json(createSuccessResponse([], { page, pageSize, total: 0 }))
    }

    const where: any = { companyId }

    const [campaigns, total] = await Promise.all([
      prisma.messageCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          professional: { select: { name: true } },
          _count: { select: { recipients: true } }
        }
      }),
      prisma.messageCampaign.count({ where })
    ])

    res.json(createSuccessResponse(campaigns, { page, pageSize, total }))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(error.message))
  }
})

// ─── Obter campanha por ID com destinatários ───
router.get('/:id', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { companyId } = resolveIds(req)

    const campaign = await prisma.messageCampaign.findFirst({
      where: { id, companyId: companyId || undefined },
      include: {
        professional: { select: { name: true } },
        recipients: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!campaign) {
      return res.status(404).json(createErrorResponse('Campanha não encontrada'))
    }

    res.json(createSuccessResponse(campaign))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(error.message))
  }
})

// ─── Criar campanha (rascunho) ───
router.post('/', auth(false), async (req, res) => {
  try {
    const { professionalId, companyId } = resolveIds(req)
    const { name, message, audienceType, audienceFilter, mediaUrl, mediaType, minDelay, maxDelay, randomize, variations } = req.body

    if (!name || !message || !audienceType) {
      return res.status(400).json(createErrorResponse('Nome, mensagem e tipo de audiência são obrigatórios'))
    }

    // Buscar professionalId para usuários
    let profId = professionalId
    if (!profId && companyId) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: companyId },
        select: { ownerId: true }
      })
      profId = empresa?.ownerId || undefined
    }

    if (!profId || !companyId) {
      return res.status(400).json(createErrorResponse('Não foi possível identificar o profissional ou empresa'))
    }

    // Buscar destinatários com base no tipo de audiência
    const recipients = await resolveAudience(audienceType, audienceFilter, profId, companyId)

    const campaign = await prisma.messageCampaign.create({
      data: {
        companyId,
        professionalId: profId,
        name,
        message,
        audienceType,
        audienceFilter: audienceFilter || undefined,
        status: 'draft',
        totalRecipients: recipients.length,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        minDelay: minDelay ? Number(minDelay) : 180,
        maxDelay: maxDelay ? Number(maxDelay) : 200,
        randomize: randomize !== undefined ? !!randomize : false,
        variations: variations || null,
        recipients: {
          create: recipients.map(r => ({
            name: r.name,
            phone: r.phone,
            sourceType: r.sourceType,
            sourceId: r.sourceId,
            status: 'pending',
            renderedMessage: renderMessage(message, r)
          }))
        }
      },
      include: {
        _count: { select: { recipients: true } }
      }
    })

    res.status(201).json(createSuccessResponse(campaign))
  } catch (error: any) {
    console.error('[campaigns] create error:', error)
    res.status(500).json(createErrorResponse(error.message))
  }
})

// ─── Disparar campanha ───
router.post('/:id/send', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { companyId } = resolveIds(req)

    const campaign = await prisma.messageCampaign.findFirst({
      where: { id, companyId: companyId || undefined },
      include: { recipients: { where: { status: 'pending' } } }
    })

    if (!campaign) {
      return res.status(404).json(createErrorResponse('Campanha não encontrada'))
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json(createErrorResponse('Campanha já foi enviada ou está em andamento'))
    }

    // Verificar se a API de WhatsApp está configurada
    const empresa = await prisma.empresa.findUnique({
      where: { id: companyId! },
      select: { whatsappProvider: true, apiKey: true, evolutionApiUrl: true, evolutionInstance: true, metaToken: true, metaPhoneNumberId: true }
    })

    const provider = empresa?.whatsappProvider || 'evolution'
    const isEvolutionConfigured = provider === 'evolution' && empresa?.evolutionApiUrl && empresa?.apiKey && empresa?.evolutionInstance
    const isMetaConfigured = provider === 'meta' && empresa?.metaToken && empresa?.metaPhoneNumberId

    if (!isEvolutionConfigured && !isMetaConfigured) {
      return res.status(400).json(createErrorResponse(
        'WhatsApp API não configurada. Vá em Configurações → Integração WhatsApp para configurar.'
      ))
    }

    // Atualizar status para "sending"
    await prisma.messageCampaign.update({
      where: { id },
      data: { status: 'sending', startedAt: new Date() }
    })

    // Processar envios em background
    processCampaignSend(id, campaign.recipients, {
      provider,
      evolutionUrl: empresa!.evolutionApiUrl!,
      evolutionKey: empresa!.apiKey!,
      evolutionInstance: empresa!.evolutionInstance!,
      metaToken: empresa!.metaToken!,
      metaPhoneId: empresa!.metaPhoneNumberId!,
      mediaUrl: campaign.mediaUrl,
      mediaType: campaign.mediaType,
      minDelay: campaign.minDelay,
      maxDelay: campaign.maxDelay,
      randomize: campaign.randomize,
      variations: campaign.variations ? (campaign.variations as string[]) : undefined
    }).catch(err => {
      console.error('[campaigns] background send error:', err)
    })

    res.json(createSuccessResponse({ message: 'Campanha iniciada', campaignId: id }))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(error.message))
  }
})

// ─── Atualizar campanha (apenas rascunhos) ───
router.put('/:id', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { companyId } = resolveIds(req)
    const { name, message, mediaUrl, mediaType, minDelay, maxDelay, randomize, variations } = req.body

    const existing = await prisma.messageCampaign.findFirst({
      where: { id, companyId: companyId || undefined }
    })

    if (!existing) {
      return res.status(404).json(createErrorResponse('Campanha não encontrada'))
    }

    if (existing.status !== 'draft') {
      return res.status(400).json(createErrorResponse('Apenas rascunhos podem ser editados'))
    }

    const campaign = await prisma.messageCampaign.update({
      where: { id },
      data: { 
        name, 
        message,
        mediaUrl: mediaUrl !== undefined ? mediaUrl : undefined,
        mediaType: mediaType !== undefined ? mediaType : undefined,
        minDelay: minDelay ? Number(minDelay) : undefined,
        maxDelay: maxDelay ? Number(maxDelay) : undefined,
        randomize: randomize !== undefined ? !!randomize : undefined,
        variations: variations !== undefined ? variations : undefined
      }
    })

    res.json(createSuccessResponse(campaign))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(error.message))
  }
})

// ─── Deletar campanha ───
router.delete('/:id', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { companyId } = resolveIds(req)

    const existing = await prisma.messageCampaign.findFirst({
      where: { id, companyId: companyId || undefined }
    })

    if (!existing) {
      return res.status(404).json(createErrorResponse('Campanha não encontrada'))
    }

    await prisma.messageCampaign.delete({ where: { id } })
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(error.message))
  }
})

// ─── Obter status de progresso da campanha ───
router.get('/:id/progress', auth(false), async (req, res) => {
  try {
    const id = Number(req.params.id)

    const campaign = await prisma.messageCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        startedAt: true,
        completedAt: true,
      }
    })

    if (!campaign) {
      return res.status(404).json(createErrorResponse('Campanha não encontrada'))
    }

    res.json(createSuccessResponse(campaign))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(error.message))
  }
})

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

interface RecipientData {
  name: string
  phone: string
  sourceType: 'lead' | 'client'
  sourceId: number
}

// Resolve audiência: busca leads/clientes com base nos filtros
async function resolveAudience(
  audienceType: string,
  audienceFilter: any,
  professionalId: number,
  companyId: number
): Promise<RecipientData[]> {
  const recipients: RecipientData[] = []
  const phones = new Set<string>() // Evita duplicatas

  if (audienceType === 'by_tags' && audienceFilter?.tags?.length) {
    const target = audienceFilter.target || 'both'
    const selectedTags = audienceFilter.tags

    if (target === 'leads' || target === 'both') {
      const leads = await prisma.lead.findMany({
        where: {
          professionalId,
          companyId,
          tags: {
            hasSome: selectedTags
          }
        },
        select: { id: true, name: true, phone: true }
      })

      for (const l of leads) {
        if (l.phone && !phones.has(l.phone)) {
          phones.add(l.phone)
          recipients.push({ name: l.name, phone: l.phone, sourceType: 'lead', sourceId: l.id })
        }
      }
    }

    if (target === 'clients' || target === 'both') {
      const clients = await prisma.client.findMany({
        where: {
          professionalId,
          companyId,
          tags: {
            hasSome: selectedTags
          }
        },
        select: { id: true, name: true, phone: true }
      })

      for (const c of clients) {
        if (c.phone && !phones.has(c.phone)) {
          phones.add(c.phone)
          recipients.push({ name: c.name, phone: c.phone, sourceType: 'client', sourceId: c.id })
        }
      }
    }
  }

  if (audienceType === 'all_leads' || audienceType === 'leads_by_status') {
    const where: any = { professionalId, companyId }
    if (audienceType === 'leads_by_status' && audienceFilter?.statuses?.length) {
      where.status = { in: audienceFilter.statuses }
    }

    const leads = await prisma.lead.findMany({
      where,
      select: { id: true, name: true, phone: true }
    })

    for (const l of leads) {
      if (l.phone && !phones.has(l.phone)) {
        phones.add(l.phone)
        recipients.push({ name: l.name, phone: l.phone, sourceType: 'lead', sourceId: l.id })
      }
    }
  }

  if (audienceType === 'all_clients') {
    const clients = await prisma.client.findMany({
      where: { professionalId, companyId },
      select: { id: true, name: true, phone: true }
    })

    for (const c of clients) {
      if (c.phone && !phones.has(c.phone)) {
        phones.add(c.phone)
        recipients.push({ name: c.name, phone: c.phone, sourceType: 'client', sourceId: c.id })
      }
    }
  }

  if (audienceType === 'both') {
    const [leads, clients] = await Promise.all([
      prisma.lead.findMany({
        where: { professionalId, companyId },
        select: { id: true, name: true, phone: true }
      }),
      prisma.client.findMany({
        where: { professionalId, companyId },
        select: { id: true, name: true, phone: true }
      })
    ])

    for (const l of leads) {
      if (l.phone && !phones.has(l.phone)) {
        phones.add(l.phone)
        recipients.push({ name: l.name, phone: l.phone, sourceType: 'lead', sourceId: l.id })
      }
    }
    for (const c of clients) {
      if (c.phone && !phones.has(c.phone)) {
        phones.add(c.phone)
        recipients.push({ name: c.name, phone: c.phone, sourceType: 'client', sourceId: c.id })
      }
    }
  }

  if (audienceType === 'manual' && audienceFilter?.recipientIds?.length) {
    const { type, recipientIds } = audienceFilter
    if (type === 'leads') {
      const leads = await prisma.lead.findMany({
        where: { id: { in: recipientIds.map(Number) }, professionalId },
        select: { id: true, name: true, phone: true }
      })
      for (const l of leads) {
        if (l.phone && !phones.has(l.phone)) {
          phones.add(l.phone)
          recipients.push({ name: l.name, phone: l.phone, sourceType: 'lead', sourceId: l.id })
        }
      }
    } else {
      const clients = await prisma.client.findMany({
        where: { id: { in: recipientIds.map(Number) }, professionalId },
        select: { id: true, name: true, phone: true }
      })
      for (const c of clients) {
        if (c.phone && !phones.has(c.phone)) {
          phones.add(c.phone)
          recipients.push({ name: c.name, phone: c.phone, sourceType: 'client', sourceId: c.id })
        }
      }
    }
  }

  return recipients
}

// Renderiza mensagem substituindo variáveis
function renderMessage(template: string, recipient: RecipientData): string {
  return template
    .replace(/\{\{nome\}\}/gi, recipient.name)
    .replace(/\{\{telefone\}\}/gi, recipient.phone)
    .replace(/\{\{primeiro_nome\}\}/gi, recipient.name.split(' ')[0])
}

// Configuração agrupada
interface WhatsAppConfig {
  provider: string
  evolutionUrl: string
  evolutionKey: string
  evolutionInstance: string
  metaToken: string
  metaPhoneId: string
  mediaUrl?: string | null
  mediaType?: string | null
  minDelay?: number
  maxDelay?: number
  randomize?: boolean
  variations?: string[]
}

// Formata telefone para o padrão internacional (55XXXXXXXXXXX)
function formatPhoneForWhatsApp(phone: string, provider: string = 'evolution'): string {
  const digits = phone.replace(/\D/g, '')
  if (provider === 'meta') {
    // Meta geralmente aceita o número no formato internacional. Se for BR, adicionar 55.
    return digits.startsWith('55') ? digits : '55' + digits
  }
  
  // Se já tem 13 dígitos (55 + DDD + 9 dígitos), retorna
  if (digits.length === 13 && digits.startsWith('55')) return digits
  // Se tem 11 dígitos (DDD + 9 dígitos), adiciona 55
  if (digits.length === 11) return '55' + digits
  // Se tem 10 dígitos (DDD + 8 dígitos fixo), adiciona 55
  if (digits.length === 10) return '55' + digits
  // Se já começa com 55, retorna
  if (digits.startsWith('55')) return digits
  // Fallback
  return '55' + digits
}

async function sendEvolutionMessage(config: WhatsAppConfig, formattedPhone: string, message: string) {
  const baseUrl = config.evolutionUrl.replace(/\/+$/, '')
  
  // Se houver anexo de mídia configurado
  if (config.mediaUrl) {
    const mediaUrlEndpoint = `${baseUrl}/message/sendMedia/${config.evolutionInstance}`
    
    // Tratamento premium para imagens e vídeos (com texto no caption)
    if (config.mediaType === 'image' || config.mediaType === 'video') {
      const response = await fetch(mediaUrlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.evolutionKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          mediaMessage: {
            mediatype: config.mediaType,
            media: config.mediaUrl,
            caption: message
          }
        })
      })
      if (!response.ok) {
        const errorData = await response.text()
        console.error(`[whatsapp-evolution] send media failed for ${formattedPhone}:`, errorData)
        return { success: false, error: `HTTP ${response.status}: ${errorData}` }
      }
      return { success: true }
    } else if (config.mediaType === 'audio') {
      // Para áudio, enviamos primeiro o arquivo de áudio e depois o texto acompanhando
      const audioResponse = await fetch(mediaUrlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.evolutionKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          mediaMessage: {
            mediatype: 'audio',
            media: config.mediaUrl
          }
        })
      })
      
      if (!audioResponse.ok) {
        const errorData = await audioResponse.text()
        console.error(`[whatsapp-evolution] send audio failed for ${formattedPhone}:`, errorData)
        return { success: false, error: `HTTP ${audioResponse.status}: ${errorData}` }
      }
      
      // Pequeno delay de 1.2s antes de enviar a mensagem de texto como follow-up
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      const textUrl = `${baseUrl}/message/sendText/${config.evolutionInstance}`
      const textResponse = await fetch(textUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.evolutionKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message
        })
      })
      
      if (!textResponse.ok) {
        const errorData = await textResponse.text()
        console.error(`[whatsapp-evolution] send text after audio failed for ${formattedPhone}:`, errorData)
        return { success: false, error: `HTTP ${textResponse.status}: ${errorData}` }
      }
      return { success: true }
    }
  }

  // Envio padrão de texto pura
  const url = `${baseUrl}/message/sendText/${config.evolutionInstance}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.evolutionKey,
    },
    body: JSON.stringify({
      number: formattedPhone,
      text: message
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error(`[whatsapp-evolution] send failed for ${formattedPhone}:`, errorData)
    return { success: false, error: `HTTP ${response.status}: ${errorData}` }
  }
  return { success: true }
}

async function sendMetaMessage(config: WhatsAppConfig, formattedPhone: string, message: string) {
  // A Meta Cloud API usa a graph API para envios.
  const url = `https://graph.facebook.com/v19.0/${config.metaPhoneId}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.metaToken}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: {
        preview_url: false,
        body: message
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error(`[whatsapp-meta] send failed for ${formattedPhone}:`, errorData)
    return { success: false, error: errorData?.error?.message || `HTTP ${response.status}` }
  }
  return { success: true }
}

async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatPhoneForWhatsApp(phone, config.provider)

  try {
    if (config.provider === 'meta') {
      return await sendMetaMessage(config, formattedPhone, message)
    } else {
      return await sendEvolutionMessage(config, formattedPhone, message)
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de conexão com API' }
  }
}

async function processCampaignSend(campaignId: number, recipients: any[], config: WhatsAppConfig) {
  let sentCount = 0
  let failedCount = 0

  for (const recipient of recipients) {
    // Escolhe aleatoriamente uma variação se a randomização estiver ativa
    let messageToSend = recipient.renderedMessage || recipient.name
    if (config.randomize && config.variations && Array.isArray(config.variations) && config.variations.length > 0) {
      const randomIndex = Math.floor(Math.random() * config.variations.length)
      const selectedVariation = config.variations[randomIndex]
      messageToSend = renderMessage(selectedVariation, recipient)
    }

    try {
      const result = await sendWhatsAppMessage(config, recipient.phone, messageToSend)

      if (result.success) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'sent', sentAt: new Date() }
        })
        sentCount++
      } else {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'failed', errorMessage: result.error || 'Falha no envio' }
        })
        failedCount++
      }
    } catch (err: any) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'failed', errorMessage: err.message || 'Erro desconhecido' }
      })
      failedCount++
    }

    // Atualiza progresso
    await prisma.messageCampaign.update({
      where: { id: campaignId },
      data: { sentCount, failedCount }
    })

    // Delay variável para evitar bloqueio do WhatsApp
    const minD = config.minDelay ?? 180
    const maxD = config.maxDelay ?? 200
    const delaySeconds = minD === maxD ? minD : Math.floor(Math.random() * (maxD - minD + 1)) + minD
    
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000))
  }

  // Finaliza a campanha
  await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      status: failedCount === recipients.length ? 'failed' : 'completed',
      completedAt: new Date(),
      sentCount,
      failedCount
    }
  })
}

