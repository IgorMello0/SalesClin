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

export type TemplateButtonInput = {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text: string
  url?: string
  phoneNumber?: string
}

export type CreateWhatsAppTemplateInput = {
  name: string
  language: string
  category: 'UTILITY' | 'MARKETING'
  headerText?: string
  headerExamples?: string[]
  bodyText: string
  bodyExamples?: string[]
  footerText?: string
  buttons?: TemplateButtonInput[]
}

function normalizeTemplateName(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

function getVariableIndexes(text: string) {
  const indexes = Array.from(text.matchAll(/\{\{(\d+)\}\}/g), (match) => Number(match[1]))
  return Array.from(new Set(indexes)).sort((left, right) => left - right)
}

function assertSequentialVariables(text: string, label: string) {
  const textWithoutValidVariables = text.replace(/\{\{\d+\}\}/g, '')
  if (/\{\{|\}\}/.test(textWithoutValidVariables)) {
    throw new Error(`${label}: use variaveis numeradas como {{1}} e {{2}}.`)
  }

  const indexes = getVariableIndexes(text)
  indexes.forEach((value, index) => {
    if (value !== index + 1) {
      throw new Error(`${label}: as variaveis devem comecar em {{1}} e seguir sem pular numeros.`)
    }
  })
  return indexes.length
}

function normalizeExamples(values: string[] | undefined, expected: number, label: string) {
  if (expected === 0) return []
  const examples = Array.isArray(values) ? values.map((value) => String(value || '').trim()) : []
  if (examples.length !== expected || examples.some((value) => !value)) {
    throw new Error(`${label}: informe um exemplo para cada variavel.`)
  }
  return examples
}

export function buildMetaTemplatePayload(input: CreateWhatsAppTemplateInput) {
  const name = normalizeTemplateName(input.name)
  const language = String(input.language || '').trim()
  const category = String(input.category || '').trim().toUpperCase()
  const headerText = String(input.headerText || '').trim()
  const bodyText = String(input.bodyText || '').trim()
  const footerText = String(input.footerText || '').trim()
  const buttons = Array.isArray(input.buttons) ? input.buttons : []

  if (!/^[a-z0-9_]{1,512}$/.test(name)) {
    throw new Error('O nome deve ter apenas letras minusculas, numeros e underline.')
  }
  if (!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language)) {
    throw new Error('Idioma invalido para o template.')
  }
  if (!['UTILITY', 'MARKETING'].includes(category)) {
    throw new Error('Categoria invalida. Use UTILITY ou MARKETING.')
  }
  if (!bodyText || bodyText.length > 1024) {
    throw new Error('O corpo e obrigatorio e deve ter no maximo 1024 caracteres.')
  }
  if (headerText.length > 60) throw new Error('O cabecalho deve ter no maximo 60 caracteres.')
  if (footerText.length > 60) throw new Error('O rodape deve ter no maximo 60 caracteres.')
  if (buttons.length > 10) throw new Error('Use no maximo 10 botoes.')

  const headerVariableCount = assertSequentialVariables(headerText, 'Cabecalho')
  const bodyVariableCount = assertSequentialVariables(bodyText, 'Corpo')
  const headerExamples = normalizeExamples(input.headerExamples, headerVariableCount, 'Cabecalho')
  const bodyExamples = normalizeExamples(input.bodyExamples, bodyVariableCount, 'Corpo')
  const urlButtonCount = buttons.filter((button) => button.type === 'URL').length
  const phoneButtonCount = buttons.filter((button) => button.type === 'PHONE_NUMBER').length
  if (urlButtonCount > 2) throw new Error('Use no maximo 2 botoes de URL.')
  if (phoneButtonCount > 1) throw new Error('Use no maximo 1 botao de telefone.')

  const components: any[] = []
  if (headerText) {
    components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: headerText,
      ...(headerExamples.length ? { example: { header_text: headerExamples } } : {}),
    })
  }

  components.push({
    type: 'BODY',
    text: bodyText,
    ...(bodyExamples.length ? { example: { body_text: [bodyExamples] } } : {}),
  })

  if (footerText) components.push({ type: 'FOOTER', text: footerText })

  if (buttons.length) {
    components.push({
      type: 'BUTTONS',
      buttons: buttons.map((button) => {
        if (!['QUICK_REPLY', 'URL', 'PHONE_NUMBER'].includes(button.type)) {
          throw new Error('Tipo de botao invalido.')
        }
        const text = String(button.text || '').trim()
        if (!text || text.length > 25) throw new Error('O texto de cada botao deve ter entre 1 e 25 caracteres.')
        if (button.type === 'URL') {
          const url = String(button.url || '').trim()
          if (!/^https:\/\//i.test(url) || /\{\{\d+\}\}/.test(url)) {
            throw new Error('Informe uma URL HTTPS estatica para o botao.')
          }
          return { type: 'URL', text, url }
        }
        if (button.type === 'PHONE_NUMBER') {
          const phoneNumber = String(button.phoneNumber || '').replace(/[^\d+]/g, '')
          if (!/^\+\d{8,15}$/.test(phoneNumber)) {
            throw new Error('Informe o telefone do botao com DDI, por exemplo +5511999999999.')
          }
          return { type: 'PHONE_NUMBER', text, phone_number: phoneNumber }
        }
        return { type: 'QUICK_REPLY', text }
      }),
    })
  }

  return {
    name,
    language,
    category,
    allow_category_change: true,
    components,
  }
}

export function buildMetaTemplateCreateRequest(
  wabaId: string,
  accessToken: string,
  input: CreateWhatsAppTemplateInput,
) {
  const normalizedWabaId = String(wabaId || '').trim()
  const normalizedAccessToken = String(accessToken || '').trim()
  if (!/^\d+$/.test(normalizedWabaId)) throw new Error('WABA ID invalido para criar o template.')
  if (!normalizedAccessToken) throw new Error('Token da Meta ausente para criar o template.')

  const payload = buildMetaTemplatePayload(input)
  return {
    endpoint: `${GRAPH_BASE_URL}/${normalizedWabaId}/message_templates`,
    options: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalizedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    payload,
  }
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

export async function createMetaTemplate(companyId: number, input: CreateWhatsAppTemplateInput) {
  const { accessToken, wabaId, connectionId } = await getMetaTemplateCredentials(companyId)
  const { endpoint, options, payload } = buildMetaTemplateCreateRequest(wabaId, accessToken, input)
  const response = await fetch(endpoint, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.error_user_msg || body?.error?.message || `Meta Graph API HTTP ${response.status}`)
  }

  const template = await prisma.whatsAppTemplate.upsert({
    where: {
      companyId_name_language: {
        companyId,
        name: payload.name,
        language: payload.language,
      },
    },
    create: {
      companyId,
      connectionId,
      externalId: body?.id ? String(body.id) : null,
      name: payload.name,
      language: payload.language,
      category: String(body?.category || payload.category),
      status: String(body?.status || 'PENDING'),
      components: payload.components,
      lastSyncedAt: new Date(),
    },
    update: {
      connectionId,
      externalId: body?.id ? String(body.id) : undefined,
      category: String(body?.category || payload.category),
      status: String(body?.status || 'PENDING'),
      rejectionReason: null,
      components: payload.components,
      lastSyncedAt: new Date(),
    },
  })

  return template
}

export async function deleteMetaTemplate(companyId: number, templateId: number) {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, companyId },
  })
  if (!template) throw new Error('Template nao encontrado para esta clinica.')

  const { accessToken, wabaId } = await getMetaTemplateCredentials(companyId)
  const url = new URL(`${GRAPH_BASE_URL}/${wabaId}/message_templates`)
  url.searchParams.set('name', template.name)
  if (template.externalId) url.searchParams.set('hsm_id', template.externalId)

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.error_user_msg || body?.error?.message || `Meta Graph API HTTP ${response.status}`)
  }

  await prisma.whatsAppTemplate.delete({ where: { id: template.id } })
  return { id: template.id, name: template.name, deleted: true }
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
