import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'

const GRAPH_VERSION = 'v19.0'
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`

type MetaStatePayload = {
  companyId: number
  userId?: number | null
}

type ManualMetaWhatsappInput = {
  phoneNumberId?: string
  wabaId?: string
  businessId?: string
  accessToken?: string
  webhookVerifyToken?: string
  twoStepPin?: string
  displayPhoneNumber?: string
}

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    'https://sellclin.com'
  ).replace(/\/$/, '')
}

function getRedirectUri() {
  return process.env.META_WHATSAPP_REDIRECT_URI || `${getPublicAppUrl()}/api/whatsapp/meta/callback`
}

function buildMetaWebhookUrl(webhookToken?: string | null) {
  return webhookToken
    ? `${getPublicAppUrl()}/api/webhooks/meta/${webhookToken}`
    : `${getPublicAppUrl()}/api/webhooks/meta`
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET nao configurado.')
  return secret
}

function requireMetaEnv() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const configId = process.env.META_WHATSAPP_CONFIG_ID

  if (!appId || !appSecret || !configId) {
    throw new Error('Meta WhatsApp nao configurado. Defina META_APP_ID, META_APP_SECRET e META_WHATSAPP_CONFIG_ID.')
  }

  return { appId, appSecret, configId, redirectUri: getRedirectUri() }
}

function cleanOptional(value?: string | null) {
  const trimmed = String(value || '').trim()
  return trimmed || null
}

function cleanRequired(value: unknown, label: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) throw new Error(`${label} e obrigatorio.`)
  return trimmed
}

async function graphGet<T = any>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${GRAPH_BASE_URL}${path}`)
  url.searchParams.set('access_token', accessToken)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString())
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.message || `Meta Graph API HTTP ${response.status}`)
  }
  return body
}

async function exchangeCodeForToken(code: string) {
  const { appId, appSecret, redirectUri } = requireMetaEnv()
  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('code', code)

  const response = await fetch(url.toString())
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.access_token) {
    throw new Error(body?.error?.message || 'Nao foi possivel trocar o codigo da Meta por token.')
  }

  return tryExchangeLongLivedToken(String(body.access_token))
}

async function tryExchangeLongLivedToken(accessToken: string) {
  const { appId, appSecret } = requireMetaEnv()
  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', accessToken)

  try {
    const response = await fetch(url.toString())
    const body = await response.json().catch(() => ({}))
    if (response.ok && body.access_token) {
      return String(body.access_token)
    }
  } catch (error) {
    console.warn('[Meta WhatsApp] Nao foi possivel trocar por token de vida longa:', error)
  }

  return accessToken
}

async function resolveMetaWhatsappAccount(accessToken: string) {
  const businesses = await graphGet<{ data?: any[] }>('/me/businesses', accessToken, {
    fields: 'id,name',
  })

  for (const business of businesses.data || []) {
    const wabas = await graphGet<{ data?: any[] }>(`/${business.id}/owned_whatsapp_business_accounts`, accessToken, {
      fields: 'id,name,phone_numbers{id,display_phone_number,verified_name}',
    }).catch(() => ({ data: [] }))

    for (const waba of wabas.data || []) {
      const phoneNumbers = waba.phone_numbers?.data || []
      const phone = phoneNumbers[0]
      if (phone?.id) {
        return {
          businessId: String(business.id),
          wabaId: String(waba.id),
          phoneNumberId: String(phone.id),
          displayPhoneNumber: phone.display_phone_number || phone.verified_name || null,
        }
      }
    }
  }

  throw new Error('Nenhum numero de WhatsApp Business foi retornado pela Meta para esta autorizacao.')
}

export function buildMetaConnectUrl(companyId: number, userId?: number | null) {
  const { appId, configId, redirectUri } = requireMetaEnv()
  const state = jwt.sign({ companyId, userId } satisfies MetaStatePayload, getJwtSecret(), { expiresIn: '20m' })
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('config_id', configId)
  url.searchParams.set('scope', 'business_management,whatsapp_business_management,whatsapp_business_messaging')
  return url.toString()
}

export function verifyMetaState(state: string): MetaStatePayload {
  return jwt.verify(state, getJwtSecret()) as MetaStatePayload
}

export async function connectMetaWhatsappFromCode(code: string, state: string) {
  const payload = verifyMetaState(state)
  const accessToken = await exchangeCodeForToken(code)
  const account = await resolveMetaWhatsappAccount(accessToken)

  return prisma.empresa.update({
    where: { id: payload.companyId },
    data: {
      whatsappProvider: 'meta',
      metaToken: accessToken,
      metaPhoneNumberId: account.phoneNumberId,
      metaWabaId: account.wabaId,
      metaBusinessId: account.businessId,
      metaPhoneDisplayNumber: account.displayPhoneNumber,
      metaConnectedAt: new Date(),
      metaConnectionStatus: 'connected',
    },
    select: {
      id: true,
      whatsappProvider: true,
      metaPhoneNumberId: true,
      metaWabaId: true,
      metaBusinessId: true,
      metaPhoneDisplayNumber: true,
      metaConnectedAt: true,
      metaConnectionStatus: true,
    },
  })
}

export async function getMetaWhatsappStatus(companyId: number) {
  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: {
      webhookToken: true,
      whatsappProvider: true,
      metaToken: true,
      metaPhoneNumberId: true,
      metaWabaId: true,
      metaBusinessId: true,
      metaPhoneDisplayNumber: true,
      metaWebhookVerifyToken: true,
      metaTwoStepPin: true,
      metaConnectedAt: true,
      metaConnectionStatus: true,
    },
  })

  if (!company) throw new Error('Empresa nao encontrada.')

  const serverSecretConfigured = Boolean(process.env.META_APP_SECRET)
  const hasAccessToken = Boolean(company.metaToken)
  const connected = company.whatsappProvider === 'meta' && Boolean(company.metaPhoneNumberId && company.metaToken)
  const configured = serverSecretConfigured

  return {
    configured,
    serverSecretConfigured,
    connected,
    status: connected ? (company.metaConnectionStatus || 'connected') : 'disconnected',
    provider: company.whatsappProvider || 'meta',
    phoneNumberId: company.metaPhoneNumberId,
    wabaId: company.metaWabaId,
    businessId: company.metaBusinessId,
    displayPhoneNumber: company.metaPhoneDisplayNumber,
    webhookVerifyToken: company.metaWebhookVerifyToken,
    hasAccessToken,
    hasTwoStepPin: Boolean(company.metaTwoStepPin),
    webhookUrl: buildMetaWebhookUrl(company.webhookToken),
    connectedAt: company.metaConnectedAt,
  }
}

export async function saveManualMetaWhatsappConfig(companyId: number, input: ManualMetaWhatsappInput) {
  const current = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      metaToken: true,
      webhookToken: true,
    },
  })

  if (!current) throw new Error('Empresa nao encontrada.')

  const phoneNumberId = cleanRequired(input.phoneNumberId, 'Phone Number ID')
  const wabaId = cleanRequired(input.wabaId, 'WhatsApp Business Account ID')
  const webhookVerifyToken = cleanRequired(input.webhookVerifyToken, 'Webhook Verify Token')
  const accessToken = cleanOptional(input.accessToken)

  if (!accessToken && !current.metaToken) {
    throw new Error('Permanent Access Token e obrigatorio na primeira configuracao.')
  }

  const data: any = {
    whatsappProvider: 'meta',
    metaPhoneNumberId: phoneNumberId,
    metaWabaId: wabaId,
    metaBusinessId: cleanOptional(input.businessId),
    metaPhoneDisplayNumber: cleanOptional(input.displayPhoneNumber),
    metaWebhookVerifyToken: webhookVerifyToken,
    metaTwoStepPin: cleanOptional(input.twoStepPin),
    metaConnectionStatus: 'connected',
    metaConnectedAt: new Date(),
  }

  if (accessToken) {
    data.metaToken = accessToken
  }

  const updated = await prisma.empresa.update({
    where: { id: companyId },
    data,
    select: {
      id: true,
      whatsappProvider: true,
      metaPhoneNumberId: true,
      metaWabaId: true,
      metaBusinessId: true,
      metaPhoneDisplayNumber: true,
      metaWebhookVerifyToken: true,
      metaConnectedAt: true,
      metaConnectionStatus: true,
      webhookToken: true,
    },
  })

  return {
    ...updated,
    webhookUrl: buildMetaWebhookUrl(updated.webhookToken),
    hasAccessToken: true,
  }
}

export async function disconnectMetaWhatsapp(companyId: number) {
  return prisma.empresa.update({
    where: { id: companyId },
    data: {
      whatsappProvider: 'meta',
      metaToken: null,
      metaPhoneNumberId: null,
      metaWabaId: null,
      metaBusinessId: null,
      metaPhoneDisplayNumber: null,
      metaWebhookVerifyToken: null,
      metaTwoStepPin: null,
      metaConnectedAt: null,
      metaConnectionStatus: 'disconnected',
    },
    select: { id: true, whatsappProvider: true, metaConnectionStatus: true },
  })
}
