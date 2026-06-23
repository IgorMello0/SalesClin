import { prisma } from '../prisma.js'

type CompanyRef = {
  id: number
  ownerId: number | null
  name: string
  isActive?: boolean
  webhookToken?: string | null
  evolutionInstance?: string | null
}

type WhatsAppStatus = {
  status: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'ERROR'
  qrcode?: string | null
  pairingCode?: string | null
  instance?: string | null
  webhookUrl?: string | null
  message?: string
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    'https://sellclin.com'
  ).replace(/\/$/, '')
}

function getCentralEvolutionConfig() {
  const baseUrl = process.env.EVOLUTION_CENTRAL_API_URL
  const apiKey = process.env.EVOLUTION_CENTRAL_API_KEY

  if (!baseUrl || !apiKey) {
    return null
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    apiKey,
  }
}

function evolutionHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    apikey: apiKey,
  }
}

async function parseJson(response: Response) {
  return response.json().catch(() => ({}))
}

function getWebhookUrl(token?: string | null) {
  if (!token) return null
  return `${getPublicAppUrl()}/api/webhooks/evolution/${token}`
}

export function normalizePhone(raw: string): string {
  return String(raw || '').replace(/@.*$/, '').replace(/\D/g, '')
}

export function getManagedEvolutionInstanceName(company: Pick<CompanyRef, 'id' | 'webhookToken'>) {
  const suffix = (company.webhookToken || '').replace(/-/g, '').slice(0, 8) || 'default'
  return `sellclin-company-${company.id}-${suffix}`
}

export async function findCompanyByInstance(instance: string) {
  const trimmed = instance.trim()
  return prisma.empresa.findFirst({
    where: {
      evolutionInstance: {
        equals: trimmed,
        mode: 'insensitive',
      },
      isActive: true,
    },
    select: { id: true, ownerId: true, name: true },
  })
}

export async function findCompanyByMetaPhoneId(phoneNumberId: string) {
  return prisma.empresa.findFirst({
    where: { metaPhoneNumberId: phoneNumberId, isActive: true },
    select: { id: true, ownerId: true, name: true },
  })
}

async function ensureCompanyWhatsappToken(companyId: number) {
  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: { id: true, ownerId: true, name: true, webhookToken: true, evolutionInstance: true, isActive: true },
  })

  if (!company) {
    throw new Error('Empresa nao encontrada.')
  }

  const instance = company.evolutionInstance || getManagedEvolutionInstanceName(company)

  if (company.evolutionInstance !== instance) {
    return prisma.empresa.update({
      where: { id: companyId },
      data: {
        whatsappProvider: 'evolution',
        evolutionInstance: instance,
      },
      select: { id: true, ownerId: true, name: true, webhookToken: true, evolutionInstance: true, isActive: true },
    })
  }

  return company
}

async function createEvolutionInstanceIfNeeded(instance: string) {
  const config = getCentralEvolutionConfig()
  if (!config) {
    throw new Error('Evolution central nao configurada. Defina EVOLUTION_CENTRAL_API_URL e EVOLUTION_CENTRAL_API_KEY.')
  }

  const attempts = [
    {
      url: `${config.baseUrl}/instance/create`,
      body: { instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
    },
    {
      url: `${config.baseUrl}/instance/create`,
      body: { instanceName: instance, qrcode: true },
    },
  ]

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      method: 'POST',
      headers: evolutionHeaders(config.apiKey),
      body: JSON.stringify(attempt.body),
    })
    const body = await parseJson(response)
    const errorText = JSON.stringify(body).toLowerCase()

    if (response.ok || response.status === 409 || errorText.includes('already') || errorText.includes('existe')) {
      return body
    }
  }

  return null
}

export async function setupEvolutionWebhookForCompany(company: Pick<CompanyRef, 'webhookToken' | 'evolutionInstance'>) {
  const config = getCentralEvolutionConfig()
  if (!config) {
    throw new Error('Evolution central nao configurada. Defina EVOLUTION_CENTRAL_API_URL e EVOLUTION_CENTRAL_API_KEY.')
  }

  const instance = company.evolutionInstance
  const webhookUrl = getWebhookUrl(company.webhookToken)
  if (!instance || !webhookUrl) {
    throw new Error('Instancia ou webhook token ausente para configurar webhook.')
  }

  const attempts = [
    {
      url: `${config.baseUrl}/webhook/set/${instance}`,
      body: { url: webhookUrl, enabled: true, webhookByEvents: true, events: ['MESSAGES_UPSERT'] },
    },
    {
      url: `${config.baseUrl}/webhook/manage/${instance}`,
      body: { url: webhookUrl, enabled: true, webhookByEvents: true, events: ['MESSAGES_UPSERT'] },
    },
    {
      url: `${config.baseUrl}/webhook/instance/${instance}`,
      body: { url: webhookUrl, enabled: true, webhook_by_events: true, events: ['MESSAGES_UPSERT'] },
    },
  ]

  let lastError = ''

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: evolutionHeaders(config.apiKey),
        body: JSON.stringify(attempt.body),
      })
      const body = await response.text().catch(() => '')

      if (response.ok) {
        return { webhookUrl, endpoint: attempt.url }
      }

      lastError = `${attempt.url} HTTP ${response.status}: ${body.slice(0, 180)}`
    } catch (error: any) {
      lastError = `${attempt.url}: ${error.message}`
    }
  }

  throw new Error(`Nao foi possivel configurar webhook na Evolution. ${lastError}`)
}

export async function getCentralWhatsappStatus(companyId: number): Promise<WhatsAppStatus> {
  const config = getCentralEvolutionConfig()
  if (!config) {
    return {
      status: 'NOT_CONFIGURED',
      message: 'Evolution central nao configurada no servidor.',
    }
  }

  const company = await ensureCompanyWhatsappToken(companyId)
  const instance = company.evolutionInstance!
  const webhookUrl = getWebhookUrl(company.webhookToken)

  try {
    await createEvolutionInstanceIfNeeded(instance)
    await setupEvolutionWebhookForCompany(company)
  } catch (error) {
    console.warn('[WhatsApp] Falha ao preparar instancia/webhook:', error)
  }

  try {
    const stateRes = await fetch(`${config.baseUrl}/instance/connectionState/${instance}`, {
      method: 'GET',
      headers: { apikey: config.apiKey },
    })

    if (stateRes.ok) {
      const connectionState: any = await parseJson(stateRes)
      if (connectionState?.instance?.state === 'open' || connectionState?.state === 'open') {
        return { status: 'CONNECTED', instance, webhookUrl }
      }
    }
  } catch (error: any) {
    console.error('[WhatsApp Status] Erro ao consultar connectionState:', error.message)
  }

  try {
    const connectRes = await fetch(`${config.baseUrl}/instance/connect/${instance}`, {
      method: 'GET',
      headers: { apikey: config.apiKey },
    })

    if (connectRes.ok) {
      const connectData: any = await parseJson(connectRes)
      if (connectData?.instance?.state === 'open') {
        return { status: 'CONNECTED', instance, webhookUrl }
      }

      const qrcode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code || null
      const pairingCode = connectData?.pairingCode || null

      return {
        status: 'DISCONNECTED',
        qrcode,
        pairingCode,
        instance,
        webhookUrl,
      }
    }
  } catch (error: any) {
    console.error('[WhatsApp Status] Erro ao gerar QR Code:', error.message)
    return { status: 'ERROR', instance, webhookUrl, message: error.message }
  }

  return { status: 'DISCONNECTED', qrcode: null, instance, webhookUrl }
}

export async function startCentralWhatsappConnection(companyId: number) {
  const company = await ensureCompanyWhatsappToken(companyId)
  const config = getCentralEvolutionConfig()
  if (!config) {
    throw new Error('Evolution central nao configurada. Defina EVOLUTION_CENTRAL_API_URL e EVOLUTION_CENTRAL_API_KEY.')
  }

  await createEvolutionInstanceIfNeeded(company.evolutionInstance!)
  await setupEvolutionWebhookForCompany(company)
  return getCentralWhatsappStatus(companyId)
}

export async function restartCentralWhatsapp(companyId: number) {
  const company = await ensureCompanyWhatsappToken(companyId)
  const config = getCentralEvolutionConfig()
  if (!config) {
    throw new Error('Evolution central nao configurada. Defina EVOLUTION_CENTRAL_API_URL e EVOLUTION_CENTRAL_API_KEY.')
  }

  const response = await fetch(`${config.baseUrl}/instance/restart/${company.evolutionInstance}`, {
    method: 'POST',
    headers: { apikey: config.apiKey },
  })

  const data = await parseJson(response)
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Erro ao reiniciar instancia Evolution.')
  }

  return data
}

export async function disconnectCentralWhatsapp(companyId: number) {
  const company = await ensureCompanyWhatsappToken(companyId)
  const config = getCentralEvolutionConfig()
  if (!config) {
    throw new Error('Evolution central nao configurada. Defina EVOLUTION_CENTRAL_API_URL e EVOLUTION_CENTRAL_API_KEY.')
  }

  const response = await fetch(`${config.baseUrl}/instance/logout/${company.evolutionInstance}`, {
    method: 'DELETE',
    headers: { apikey: config.apiKey },
  })

  const data = await parseJson(response)
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Erro ao desconectar WhatsApp.')
  }

  return data
}

export async function processIncomingMessage(opts: {
  companyId: number
  ownerId: number | null
  phone: string
  pushName: string
  messageText: string
  rawPayload: any
  origin: string
  providerMessageId?: string | null
}) {
  const { companyId, ownerId, phone, pushName, messageText, rawPayload, origin, providerMessageId } = opts

  if (!ownerId) {
    console.warn(`[Webhook] Empresa #${companyId} sem ownerId. Ignorando.`)
    return { action: 'ignored', reason: 'no_owner' }
  }

  let lead = await prisma.lead.findFirst({
    where: { phone, companyId },
  })

  let action: 'created' | 'existing' | 'duplicate_message' = 'existing'

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        professionalId: ownerId,
        companyId,
        name: pushName || 'Contato WhatsApp',
        phone,
        status: 'prospect_lead',
        origin,
        notes: messageText ? `Primeira mensagem: ${messageText}` : null,
        tags: ['whatsapp-auto'],
        isScheduled: false,
        value: 0,
      },
    })

    action = 'created'
  }

  let conversa = await prisma.conversa.findFirst({
    where: { phone, companyId },
  })

  if (!conversa) {
    conversa = await prisma.conversa.create({
      data: {
        companyId,
        leadId: lead.id,
        professionalId: ownerId,
        phone,
        app: 'whatsapp',
        channel: origin,
        startedAt: new Date(),
      },
    })
  } else if (!conversa.leadId) {
    conversa = await prisma.conversa.update({
      where: { id: conversa.id },
      data: { leadId: lead.id },
    })
  }

  if (providerMessageId) {
    const existingMessage = await prisma.mensagem.findFirst({
      where: { conversationId: conversa.id, providerMessageId },
      select: { id: true },
    })

    if (existingMessage) {
      return { action: 'duplicate_message', leadId: lead.id, conversaId: conversa.id, messageId: existingMessage.id }
    }
  }

  const mensagem = await prisma.mensagem.create({
    data: {
      conversationId: conversa.id,
      sender: 'cliente',
      content: messageText || '(midia)',
      providerMessageId: providerMessageId || null,
      rawJson: rawPayload,
      origin,
    },
  })

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'sistema',
      content: action === 'created'
        ? `Lead criado automaticamente via ${origin}. Nome: "${pushName || 'Contato WhatsApp'}".`
        : `Novo contato recebido via ${origin}: "${messageText?.substring(0, 120) || '(midia)'}"`,
      createdBy: 'Sistema',
    },
  })

  return { action, leadId: lead.id, conversaId: conversa.id, messageId: mensagem.id }
}

export async function handleEvolutionPayload(body: any, empresa: { id: number; ownerId: number | null; name: string }) {
  const event = body.event || ''
  if (!event.includes('messages') && !event.includes('MESSAGES')) {
    return { received: true, ignored: true, reason: 'not_message_event' }
  }

  const data = body.data || body
  const key = data.key || {}

  if (key.fromMe === true) {
    return { received: true, ignored: true, reason: 'fromMe' }
  }

  const remoteJid = key.remoteJid || data.remoteJid || ''
  if (remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) {
    return { received: true, ignored: true, reason: 'group' }
  }

  const phone = normalizePhone(remoteJid)
  const pushName = data.pushName || data.senderName || ''
  const messageObj = data.message || {}
  const messageText = messageObj.conversation
    || messageObj.extendedTextMessage?.text
    || messageObj.imageMessage?.caption
    || messageObj.videoMessage?.caption
    || ''
  const providerMessageId = key.id || data.messageId || data.id || null

  if (!phone) {
    return { received: true, ignored: true, reason: 'no_phone' }
  }

  const result = await processIncomingMessage({
    companyId: empresa.id,
    ownerId: empresa.ownerId,
    phone,
    pushName,
    messageText,
    rawPayload: body,
    origin: 'WhatsApp',
    providerMessageId,
  })

  return { success: true, ...result }
}

export async function handleMetaMessages(body: any, empresaOverride?: { id: number; ownerId: number | null; name: string }) {
  if (!body.entry || !Array.isArray(body.entry)) return

  for (const entry of body.entry) {
    const changes = entry.changes || []
    for (const change of changes) {
      if (change.field !== 'messages') continue

      const value = change.value || {}
      const metadata = value.metadata || {}
      const phoneNumberId = metadata.phone_number_id || ''
      const messages = value.messages || []
      const contacts = value.contacts || []

      if (messages.length === 0) continue

      let empresa = empresaOverride
      if (!empresa) {
        if (!phoneNumberId) continue
        empresa = await findCompanyByMetaPhoneId(phoneNumberId)
        if (!empresa) continue
      }

      for (const msg of messages) {
        if (msg.type === 'status' || !msg.from) continue

        const phone = normalizePhone(msg.from)
        const contactInfo = contacts.find((contact: any) => contact.wa_id === msg.from)
        const pushName = contactInfo?.profile?.name || ''
        const messageText = msg.text?.body || msg.image?.caption || msg.video?.caption || ''

        await processIncomingMessage({
          companyId: empresa.id,
          ownerId: empresa.ownerId,
          phone,
          pushName,
          messageText,
          rawPayload: msg,
          origin: 'WhatsApp Official',
          providerMessageId: msg.id || null,
        })
      }
    }
  }
}
