import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'

const GRAPH_VERSION = 'v19.0'
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`

type MetaStatePayload = {
  companyId: number
  userId?: number | null
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
      whatsappProvider: true,
      metaPhoneNumberId: true,
      metaWabaId: true,
      metaBusinessId: true,
      metaPhoneDisplayNumber: true,
      metaConnectedAt: true,
      metaConnectionStatus: true,
    },
  })

  if (!company) throw new Error('Empresa nao encontrada.')

  const configured = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_WHATSAPP_CONFIG_ID)
  const connected = company.whatsappProvider === 'meta' && Boolean(company.metaPhoneNumberId)

  return {
    configured,
    connected,
    status: connected ? (company.metaConnectionStatus || 'connected') : configured ? 'disconnected' : 'not_configured',
    provider: company.whatsappProvider || 'evolution',
    phoneNumberId: company.metaPhoneNumberId,
    wabaId: company.metaWabaId,
    businessId: company.metaBusinessId,
    displayPhoneNumber: company.metaPhoneDisplayNumber,
    connectedAt: company.metaConnectedAt,
  }
}

export async function disconnectMetaWhatsapp(companyId: number) {
  return prisma.empresa.update({
    where: { id: companyId },
    data: {
      whatsappProvider: 'evolution',
      metaToken: null,
      metaPhoneNumberId: null,
      metaWabaId: null,
      metaBusinessId: null,
      metaPhoneDisplayNumber: null,
      metaConnectedAt: null,
      metaConnectionStatus: 'disconnected',
    },
    select: { id: true, whatsappProvider: true, metaConnectionStatus: true },
  })
}
