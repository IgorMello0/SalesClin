import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { getCentralEvolutionRuntime } from '../services/whatsapp-integration.js'

export const router = Router()

const SPREADSHEET_CONTACT_LIMIT = 5000

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

// ─── Stream de Mídias de Campanhas (Público, para a Evolution API obter as mídias salvas em Base64) ───
router.get('/media/:campaignId/:index', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId)
    const indexStr = req.params.index

    const campaign = await prisma.messageCampaign.findUnique({
      where: { id: campaignId },
      select: { mediaUrl: true }
    })

    if (!campaign || !campaign.mediaUrl) {
      return res.status(404).send('Mídia não encontrada')
    }

    let targetUrl = ''
    if (indexStr === 'single') {
      targetUrl = campaign.mediaUrl
    } else {
      const parsed = JSON.parse(campaign.mediaUrl)
      const index = parseInt(indexStr)
      if (Array.isArray(parsed) && parsed[index]) {
        targetUrl = parsed[index].url
      }
    }

    if (!targetUrl || !targetUrl.startsWith('data:')) {
      return res.status(404).send('Formato de mídia inválido ou não encontrado')
    }

    // Parse do Data URL base64
    const match = targetUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return res.status(400).send('Dados de mídia corrompidos')
    }

    const mimeType = match[1]
    const base64Data = match[2]
    const buffer = Buffer.from(base64Data, 'base64')

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cacheable por 1 ano
    res.send(buffer)
  } catch (error: any) {
    console.error('[campaigns-media-stream] error:', error)
    res.status(500).send('Erro ao processar mídia')
  }
})

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
    const audienceResolution = await resolveAudience(audienceType, audienceFilter, profId, companyId)
    const recipients = audienceResolution.recipients

    if (recipients.length === 0) {
      return res.status(400).json(createErrorResponse('Nenhum destinatario valido encontrado para esta campanha'))
    }

    const leadIds = recipients
      .filter(r => r.sourceType === 'lead' && r.sourceId)
      .map(r => Number(r.sourceId))
    const clientIds = recipients
      .filter(r => r.sourceType === 'client' && r.sourceId)
      .map(r => Number(r.sourceId))

    // Buscar próximos agendamentos (futuros) em lote
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { clientId: { in: clientIds } },
          { leadId: { in: leadIds } }
        ],
        startTime: { gte: new Date() },
        status: { in: ['agendado', 'confirmado'] }
      },
      orderBy: { startTime: 'asc' }
    })

    // Buscar agendamentos concluídos (passados) em lote
    const pastAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { clientId: { in: clientIds } },
          { leadId: { in: leadIds } }
        ],
        status: 'concluido'
      },
      orderBy: { startTime: 'desc' }
    })

    // Criar mapas O(1) de busca por cliente/lead
    const upcomingMap = new Map<string, any>()
    for (const appt of upcomingAppointments) {
      const key = appt.clientId ? `client_${appt.clientId}` : `lead_${appt.leadId}`
      if (!upcomingMap.has(key)) {
        upcomingMap.set(key, appt)
      }
    }

    const pastMap = new Map<string, any>()
    for (const appt of pastAppointments) {
      const key = appt.clientId ? `client_${appt.clientId}` : `lead_${appt.leadId}`
      if (!pastMap.has(key)) {
        pastMap.set(key, appt)
      }
    }

    const campaign = await prisma.messageCampaign.create({
      data: {
        companyId,
        professionalId: profId,
        name,
        message,
        audienceType,
        audienceFilter: audienceResolution.audienceFilter || undefined,
        status: 'draft',
        totalRecipients: recipients.length,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        minDelay: minDelay ? Number(minDelay) : 180,
        maxDelay: maxDelay ? Number(maxDelay) : 200,
        randomize: randomize !== undefined ? !!randomize : false,
        variations: variations || null,
        recipients: {
          create: recipients.map(r => {
            const key = r.sourceType === 'client'
              ? `client_${r.sourceId}`
              : r.sourceType === 'lead'
                ? `lead_${r.sourceId}`
                : `spreadsheet_${r.phone}`
            const upcomingAppt = upcomingMap.get(key)
            const pastAppt = pastMap.get(key)
            return {
              name: r.name,
              phone: r.phone,
              sourceType: r.sourceType,
              sourceId: r.sourceId ?? null,
              status: 'pending',
              renderedMessage: renderMessage(message, r, upcomingAppt, pastAppt)
            }
          })
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
      select: {
        id: true,
        webhookToken: true,
        whatsappProvider: true,
        evolutionMode: true,
        apiKey: true,
        evolutionApiUrl: true,
        evolutionInstance: true,
        metaToken: true,
        metaPhoneNumberId: true,
      }
    })

    const provider = empresa?.whatsappProvider || 'evolution'
    let centralEvolution: Awaited<ReturnType<typeof getCentralEvolutionRuntime>> | null = null
    if (provider === 'evolution') {
      try {
        centralEvolution = await getCentralEvolutionRuntime(companyId!)
      } catch (error) {
        console.warn('[campaigns] Evolution central indisponivel, tentando configuracao legada da empresa:', error)
      }
    }

    const isEvolutionConfigured = provider === 'evolution' && Boolean(
      centralEvolution || (empresa?.evolutionApiUrl && empresa?.apiKey && empresa?.evolutionInstance)
    )
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

    let absoluteMediaUrl = campaign.mediaUrl
    if (absoluteMediaUrl) {
      try {
        const parsed = JSON.parse(absoluteMediaUrl)
        if (Array.isArray(parsed)) {
          const requestHost = req.get('host')
          const protocol = req.protocol
          const mapped = parsed.map((item: any, idx: number) => {
            if (item.url) {
              if (item.url.startsWith('data:')) {
                return {
                  ...item,
                  url: `${protocol}://${requestHost}/api/campaigns/media/${id}/${idx}`
                }
              } else if (item.url.startsWith('/uploads/')) {
                return {
                  ...item,
                  url: `${protocol}://${requestHost}${item.url}`
                }
              }
            }
            return item
          })
          absoluteMediaUrl = JSON.stringify(mapped)
        } else if (absoluteMediaUrl.startsWith('data:')) {
          const requestHost = req.get('host')
          const protocol = req.protocol
          absoluteMediaUrl = `${protocol}://${requestHost}/api/campaigns/media/${id}/single`
        } else if (absoluteMediaUrl.startsWith('/uploads/')) {
          const requestHost = req.get('host')
          const protocol = req.protocol
          absoluteMediaUrl = `${protocol}://${requestHost}${absoluteMediaUrl}`
        }
      } catch {
        if (absoluteMediaUrl.startsWith('data:')) {
          const requestHost = req.get('host')
          const protocol = req.protocol
          absoluteMediaUrl = `${protocol}://${requestHost}/api/campaigns/media/${id}/single`
        } else if (absoluteMediaUrl.startsWith('/uploads/')) {
          const requestHost = req.get('host')
          const protocol = req.protocol
          absoluteMediaUrl = `${protocol}://${requestHost}${absoluteMediaUrl}`
        }
      }
    }

    // Processar envios em background
    processCampaignSend(id, campaign.recipients, {
      provider,
      evolutionUrl: centralEvolution?.baseUrl || empresa!.evolutionApiUrl!,
      evolutionKey: centralEvolution?.apiKey || empresa!.apiKey!,
      evolutionInstance: centralEvolution?.instance || empresa!.evolutionInstance!,
      metaToken: empresa!.metaToken!,
      metaPhoneId: empresa!.metaPhoneNumberId!,
      mediaUrl: absoluteMediaUrl,
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

    // Deletar destinatários primeiro para evitar erro de chave estrangeira
    await prisma.campaignRecipient.deleteMany({
      where: { campaignId: id }
    })

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
  sourceType: 'lead' | 'client' | 'spreadsheet'
  sourceId?: number | null
}

interface AudienceResolution {
  recipients: RecipientData[]
  audienceFilter?: any
}

function normalizeSpreadsheetContacts(audienceFilter: any): {
  recipients: RecipientData[]
  metadata: Record<string, any>
} {
  const rawContacts = Array.isArray(audienceFilter?.contacts) ? audienceFilter.contacts : []
  const contacts = rawContacts.slice(0, SPREADSHEET_CONTACT_LIMIT)
  const phones = new Set<string>()
  const recipients: RecipientData[] = []
  let duplicateRows = 0
  let invalidRows = 0

  for (const contact of contacts) {
    const phone = String(contact?.phone || contact?.telefone || contact?.whatsapp || contact?.celular || '').replace(/\D/g, '')
    const name = String(contact?.name || contact?.nome || contact?.cliente || contact?.contato || '').trim() || 'Contato'

    if (!phone) {
      invalidRows++
      continue
    }

    if (phones.has(phone)) {
      duplicateRows++
      continue
    }

    phones.add(phone)
    recipients.push({ name, phone, sourceType: 'spreadsheet', sourceId: null })
  }

  const clientStats = audienceFilter?.stats || {}
  const totalImported = Number(clientStats.totalImported || rawContacts.length || contacts.length)
  const clientInvalidRows = Number(clientStats.invalidRows)
  const clientDuplicateRows = Number(clientStats.duplicateRows)

  return {
    recipients,
    metadata: {
      source: audienceFilter?.source || audienceFilter?.fileName || null,
      totalImported: Number.isFinite(totalImported) ? totalImported : rawContacts.length,
      totalReceived: rawContacts.length,
      totalProcessed: contacts.length,
      totalValid: recipients.length,
      duplicateRows: Number.isFinite(clientDuplicateRows) ? Math.max(clientDuplicateRows, duplicateRows) : duplicateRows,
      invalidRows: Number.isFinite(clientInvalidRows) ? Math.max(clientInvalidRows, invalidRows) : invalidRows,
      limit: SPREADSHEET_CONTACT_LIMIT,
      truncated: rawContacts.length > SPREADSHEET_CONTACT_LIMIT || Boolean(clientStats.truncated),
    },
  }
}

// Resolve audiência: busca leads/clientes com base nos filtros
async function resolveAudience(
  audienceType: string,
  audienceFilter: any,
  professionalId: number,
  companyId: number
): Promise<AudienceResolution> {
  const recipients: RecipientData[] = []
  const phones = new Set<string>() // Evita duplicatas

  if (audienceType === 'spreadsheet' && Array.isArray(audienceFilter?.contacts)) {
    const spreadsheetAudience = normalizeSpreadsheetContacts(audienceFilter)
    return {
      recipients: spreadsheetAudience.recipients,
      audienceFilter: spreadsheetAudience.metadata,
    }
  }

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

  return {
    recipients,
    audienceFilter: audienceFilter || undefined,
  }
}

// Renderiza mensagem substituindo variáveis
function renderMessage(
  template: string, 
  recipient: any, 
  upcomingAppt?: any, 
  pastAppt?: any
): string {
  let msg = template
    .replace(/\{\{nome\}\}/gi, recipient.name)
    .replace(/\{\{telefone\}\}/gi, recipient.phone)
    .replace(/\{\{primeiro_nome\}\}/gi, recipient.name.split(' ')[0])

  // Substituição para o próximo agendamento (futuro)
  if (upcomingAppt) {
    const upcomingDate = formatDate(upcomingAppt.startTime)
    const upcomingTime = formatTime(upcomingAppt.startTime)
    msg = msg
      .replace(/\{\{data_agendamento\}\}/gi, upcomingDate)
      .replace(/\{\{hora_agendamento\}\}/gi, upcomingTime)
      .replace(/\{\{proxima_data\}\}/gi, upcomingDate)
      .replace(/\{\{proxima_hora\}\}/gi, upcomingTime)
  } else {
    msg = msg
      .replace(/\{\{data_agendamento\}\}/gi, '')
      .replace(/\{\{hora_agendamento\}\}/gi, '')
      .replace(/\{\{proxima_data\}\}/gi, '')
      .replace(/\{\{proxima_hora\}\}/gi, '')
  }

  // Substituição para o último agendamento (passado concluído)
  if (pastAppt) {
    const pastDate = formatDate(pastAppt.startTime)
    const pastTime = formatTime(pastAppt.startTime)
    msg = msg
      .replace(/\{\{ultima_data\}\}/gi, pastDate)
      .replace(/\{\{ultima_hora\}\}/gi, pastTime)
      .replace(/\{\{data_ultima_consulta\}\}/gi, pastDate)
      .replace(/\{\{hora_ultima_consulta\}\}/gi, pastTime)
  } else {
    msg = msg
      .replace(/\{\{ultima_data\}\}/gi, '')
      .replace(/\{\{ultima_hora\}\}/gi, '')
      .replace(/\{\{data_ultima_consulta\}\}/gi, '')
      .replace(/\{\{hora_ultima_consulta\}\}/gi, '')
  }

  return msg
}

function formatDate(date: any): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return ''
  }
}

function formatTime(date: any): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return ''
  }
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

function cleanMediaUrl(url: string): string {
  if (url.startsWith('data:')) {
    const commaIndex = url.indexOf(',')
    if (commaIndex !== -1) {
      return url.substring(commaIndex + 1)
    }
  }
  return url
}

function getMimeType(url: string): string | undefined {
  if (url.startsWith('data:')) {
    const match = url.match(/data:([^;]+);base64/)
    if (match) return match[1]
  }
  return undefined
}

async function sendEvolutionMessage(config: WhatsAppConfig, formattedPhone: string, message: string) {
  const baseUrl = config.evolutionUrl.replace(/\/+$/, '')

  interface MediaAttachment {
    url: string
    type: 'image' | 'video' | 'audio'
  }

  let attachments: MediaAttachment[] = []
  if (config.mediaUrl) {
    try {
      const parsed = JSON.parse(config.mediaUrl)
      if (Array.isArray(parsed)) {
        attachments = parsed.map((item: any) => ({
          url: item.url,
          type: item.type || 'image'
        }))
      } else {
        attachments = [{ url: config.mediaUrl, type: (config.mediaType as any) || 'image' }]
      }
    } catch {
      attachments = [{ url: config.mediaUrl, type: (config.mediaType as any) || 'image' }]
    }
  }

  // CASO 1: Múltiplas mídias
  if (attachments.length > 1) {
    if (message.trim()) {
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
        console.error(`[whatsapp-evolution] send text failed in multi-media for ${formattedPhone}:`, errorData)
        return { success: false, error: `HTTP ${textResponse.status}: ${errorData}` }
      }
    }

    for (let i = 0; i < attachments.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const att = attachments[i]
      const isAudio = att.type === 'audio'
      const mediaUrlEndpoint = isAudio
        ? `${baseUrl}/message/sendWhatsAppAudio/${config.evolutionInstance}`
        : `${baseUrl}/message/sendMedia/${config.evolutionInstance}`
      
      const payload: any = isAudio
        ? {
            number: formattedPhone,
            audio: att.url
          }
        : {
            number: formattedPhone,
            mediatype: att.type,
            media: att.url,
            fileName: att.type === 'image' ? 'imagem.png' : 'video.mp4'
          }
      if (!isAudio) {
        const mime = getMimeType(att.url)
        if (mime) {
          payload.mimetype = mime
        }
      }

      const mediaResponse = await fetch(mediaUrlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.evolutionKey,
        },
        body: JSON.stringify(payload)
      })

      if (!mediaResponse.ok) {
        const errorData = await mediaResponse.text()
        console.error(`[whatsapp-evolution] send media index ${i} failed for ${formattedPhone}:`, errorData)
        return { success: false, error: `Falha no anexo ${i + 1} (${att.type}): HTTP ${mediaResponse.status}: ${errorData}` }
      }
    }

    return { success: true }
  }

  // CASO 2: Único anexo de mídia (Lógica original preservada)
  if (attachments.length === 1) {
    const single = attachments[0]

    if (single.type === 'image' || single.type === 'video') {
      const mediaUrlEndpoint = `${baseUrl}/message/sendMedia/${config.evolutionInstance}`
      const payload: any = {
        number: formattedPhone,
        mediatype: single.type,
        media: single.url,
        caption: message,
        fileName: single.type === 'image' ? 'imagem.png' : 'video.mp4'
      }
      const mime = getMimeType(single.url)
      if (mime) {
        payload.mimetype = mime
      }

      const response = await fetch(mediaUrlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.evolutionKey,
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const responseError = await response.text()
        console.error(`[whatsapp-evolution] send media failed for ${formattedPhone}:`, responseError)
        return { success: false, error: `HTTP ${response.status}: ${responseError}` }
      }
      return { success: true }
    } else if (single.type === 'audio') {
      const mediaUrlEndpoint = `${baseUrl}/message/sendWhatsAppAudio/${config.evolutionInstance}`
      const payload = {
        number: formattedPhone,
        audio: single.url
      }

      const audioResponse = await fetch(mediaUrlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.evolutionKey,
        },
        body: JSON.stringify(payload)
      })
      
      if (!audioResponse.ok) {
        const errorData = await audioResponse.text()
        console.error(`[whatsapp-evolution] send audio failed for ${formattedPhone}:`, errorData)
        return { success: false, error: `HTTP ${audioResponse.status}: ${errorData}` }
      }
      
      if (message.trim()) {
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
      }
      return { success: true }
    }
  }

  // CASO 3: Sem mídia (apenas texto)
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
      
      // Busca agendamentos apenas quando temos um sourceId válido e explícito,
      // evitando que filtros undefined façam o Prisma retornar agendamentos de outros clientes/leads.
      let upcomingAppt = null
      let pastAppt = null

      if (recipient.sourceId) {
        const apptFilter: any = {
          ...(recipient.sourceType === 'client' && { clientId: recipient.sourceId }),
          ...(recipient.sourceType === 'lead' && { leadId: recipient.sourceId }),
        }

        // Só busca se pelo menos um filtro de identidade foi definido
        if (Object.keys(apptFilter).length > 0) {
          upcomingAppt = await prisma.appointment.findFirst({
            where: {
              ...apptFilter,
              startTime: { gte: new Date() },
              status: { in: ['agendado', 'confirmado'] }
            },
            orderBy: { startTime: 'asc' }
          })

          pastAppt = await prisma.appointment.findFirst({
            where: {
              ...apptFilter,
              status: 'concluido'
            },
            orderBy: { startTime: 'desc' }
          })
        }
      }

      messageToSend = renderMessage(selectedVariation, recipient, upcomingAppt, pastAppt)
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
