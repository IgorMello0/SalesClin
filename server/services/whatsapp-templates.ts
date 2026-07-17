import { prisma } from '../prisma.js'
import { getWhatsAppConnection } from './whatsapp-connections.js'

const GRAPH_VERSION = String(process.env.META_GRAPH_VERSION || 'v19.0').replace(/^v?/, 'v')
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`

type MetaTemplate = {
  id?: string
  name?: string
  language?: string
  category?: string
  status?: string
  quality_score?: string | { score?: string }
  rejected_reason?: string
  parameter_format?: string
  components?: unknown[]
}

async function getMetaTemplateCredentials(companyId: number) {
  const [connection, company] = await Promise.all([
    getWhatsAppConnection(companyId),
    prisma.empresa.findUnique({
      where: { id: companyId },
      select: { metaToken: true, metaWabaId: true, whatsappProvider: true },
    }),
  ])

  if (!company) throw new Error('Empresa nao encontrada.')

  const accessToken = connection?.provider === 'meta' ? connection.accessToken : company.metaToken
  const wabaId = connection?.provider === 'meta' ? connection.wabaId : company.metaWabaId

  if (!accessToken || !wabaId || company.whatsappProvider !== 'meta') {
    throw new Error('Conecte o WhatsApp Oficial antes de sincronizar templates.')
  }

  return { accessToken, wabaId, connectionId: connection?.id || null }
}

async function fetchMetaTemplates(wabaId: string, accessToken: string) {
  const templates: MetaTemplate[] = []
  let nextUrl: string | null = `${GRAPH_BASE_URL}/${wabaId}/message_templates`

  while (nextUrl) {
    const url = new URL(nextUrl)
    url.searchParams.set(
      'fields',
      'id,name,language,category,status,quality_score,rejected_reason,parameter_format,components',
    )
    url.searchParams.set('limit', '250')

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body?.error?.message || `Meta Graph API HTTP ${response.status}`)
    }

    templates.push(...(Array.isArray(body?.data) ? body.data : []))
    nextUrl = typeof body?.paging?.next === 'string' ? body.paging.next : null
  }

  return templates
}

function normalizeQualityScore(value: MetaTemplate['quality_score']) {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.score || null
}

export async function syncMetaTemplates(companyId: number) {
  const { accessToken, wabaId, connectionId } = await getMetaTemplateCredentials(companyId)
  const templates = await fetchMetaTemplates(wabaId, accessToken)
  const syncedAt = new Date()

  for (const template of templates) {
    if (!template.name || !template.language) continue

    await prisma.whatsAppTemplate.upsert({
      where: {
        companyId_name_language: {
          companyId,
          name: template.name,
          language: template.language,
        },
      },
      create: {
        companyId,
        connectionId,
        externalId: template.id || null,
        name: template.name,
        language: template.language,
        category: template.category || 'UNKNOWN',
        status: template.status || 'UNKNOWN',
        qualityScore: normalizeQualityScore(template.quality_score),
        rejectionReason: template.rejected_reason || null,
        parameterFormat: template.parameter_format || null,
        components: (template.components || []) as any,
        lastSyncedAt: syncedAt,
      },
      update: {
        connectionId,
        externalId: template.id || null,
        category: template.category || 'UNKNOWN',
        status: template.status || 'UNKNOWN',
        qualityScore: normalizeQualityScore(template.quality_score),
        rejectionReason: template.rejected_reason || null,
        parameterFormat: template.parameter_format || null,
        components: (template.components || []) as any,
        lastSyncedAt: syncedAt,
      },
    })
  }

  if (connectionId) {
    await prisma.whatsAppConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: syncedAt },
    })
  }

  return listWhatsAppTemplates(companyId)
}

export async function listWhatsAppTemplates(companyId: number, status?: string) {
  return prisma.whatsAppTemplate.findMany({
    where: {
      companyId,
      ...(status ? { status: status.toUpperCase() } : {}),
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }, { language: 'asc' }],
  })
}

export async function getApprovedWhatsAppTemplate(companyId: number, templateId: number) {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, companyId },
  })

  if (!template) throw new Error('Template nao encontrado para esta clinica.')
  if (template.status.toUpperCase() !== 'APPROVED') {
    throw new Error(`O template ${template.name} nao esta aprovado na Meta.`)
  }

  return template
}
