import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import {
  clearMetaConnection,
  getWhatsAppConnection,
  isCoexistenceEnabled,
  upsertMetaConnection,
  type WhatsAppOfficialMode,
} from './whatsapp-connections.js'

const GRAPH_VERSION = String(process.env.META_GRAPH_VERSION || 'v19.0').replace(/^v?/, 'v')
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`

type MetaStatePayload = {
  companyId: number
  userId?: number | null
  officialMode: WhatsAppOfficialMode
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

function requireMetaCredentials() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error('Meta WhatsApp nao configurado. Defina META_APP_ID e META_APP_SECRET.')
  }

  return { appId, appSecret }
}

function requireMetaEnv(officialMode: WhatsAppOfficialMode = 'cloud_api') {
  const { appId, appSecret } = requireMetaCredentials()
  const configId = officialMode === 'coexistence'
    ? process.env.META_WHATSAPP_COEXISTENCE_CONFIG_ID
    : process.env.META_WHATSAPP_CONFIG_ID

  if (!configId) {
    const variable = officialMode === 'coexistence'
      ? 'META_WHATSAPP_COEXISTENCE_CONFIG_ID'
      : 'META_WHATSAPP_CONFIG_ID'
    throw new Error(`Meta WhatsApp nao configurado para este modo. Defina ${variable}.`)
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

async function graphPost<T = any>(path: string, accessToken: string, body?: Record<string, unknown>): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${GRAPH_BASE_URL}${path}`)
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error?.message || `Meta Graph API HTTP ${response.status}`)
  }
  return payload
}

function getMetaAppAccessToken() {
  const explicitToken = cleanOptional(
    process.env.META_SYSTEM_USER_ACCESS_TOKEN ||
    process.env.META_APP_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN,
  )
  if (explicitToken) return explicitToken

  const { appId, appSecret } = requireMetaCredentials()
  return `${appId}|${appSecret}`
}

function extractWabaIdsFromDebugToken(debugToken: any) {
  const ids = new Set<string>()
  const granularScopes = debugToken?.data?.granular_scopes || []

  for (const scope of granularScopes) {
    const scopeName = String(scope?.scope || '')
    if (!scopeName.startsWith('whatsapp_business_')) continue

    const targetIds = Array.isArray(scope?.target_ids) ? scope.target_ids : []
    for (const targetId of targetIds) {
      const cleaned = cleanOptional(targetId)
      if (cleaned) ids.add(cleaned)
    }
  }

  return [...ids]
}

async function getWabaIdsFromDebugToken(accessToken: string) {
  const appAccessToken = getMetaAppAccessToken()
  const debugToken = await graphGet('/debug_token', appAccessToken, {
    input_token: accessToken,
    fields: 'app_id,type,is_valid,granular_scopes',
  }).catch((error) => {
    console.warn('[Meta WhatsApp] Nao foi possivel ler debug_token:', error)
    return null
  })

  return extractWabaIdsFromDebugToken(debugToken)
}

type MetaWebhookSubscription = {
  callbackUrl: string
  overrideVerified: boolean
}

function createWebhookVerifyToken(current?: string | null) {
  return cleanOptional(current) || randomBytes(32).toString('hex')
}

async function subscribeWhatsappApp(
  wabaId: string,
  accessToken: string,
  webhook?: { callbackUrl: string; verifyToken: string },
): Promise<MetaWebhookSubscription | null> {
  try {
    await graphPost(`/${wabaId}/subscribed_apps`, accessToken)

    if (!webhook) return null

    await graphPost(`/${wabaId}/subscribed_apps`, accessToken, {
      override_callback_uri: webhook.callbackUrl,
      verify_token: webhook.verifyToken,
    })

    const subscriptions = await graphGet<{ data?: Array<{ override_callback_uri?: string }> }>(
      `/${wabaId}/subscribed_apps`,
      accessToken,
    ).catch(() => ({ data: [] }))
    const reportedCallbacks = (subscriptions.data || [])
      .map((item) => cleanOptional(item?.override_callback_uri))
      .filter(Boolean)
    const overrideVerified = reportedCallbacks.length === 0
      || reportedCallbacks.includes(webhook.callbackUrl)

    if (!overrideVerified) {
      throw new Error('A Meta manteve outro callback configurado para esta conta do WhatsApp.')
    }

    return { callbackUrl: webhook.callbackUrl, overrideVerified }
  } catch (error: any) {
    throw new Error(
      `Nao foi possivel habilitar o recebimento de mensagens na Meta: ${error.message || 'verifique as permissoes do token.'}`
    )
  }
}

async function exchangeCodeForToken(code: string) {
  const { appId, appSecret } = requireMetaCredentials()
  const redirectUri = getRedirectUri()
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
  const { appId, appSecret } = requireMetaCredentials()
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

async function getWabaPhoneNumbers(wabaId: string, accessToken: string) {
  return graphGet<{ data?: any[] }>(`/${wabaId}/phone_numbers`, accessToken, {
    fields: 'id,display_phone_number,verified_name',
  }).catch(() => ({ data: [] }))
}

async function resolveWabaFromEdge(
  business: any,
  edgeName: string,
  accessToken: string,
) {
  const wabas = await graphGet<{ data?: any[] }>(`/${business.id}/${edgeName}`, accessToken, {
    fields: 'id,name,phone_numbers{id,display_phone_number,verified_name}',
  }).catch(() => ({ data: [] }))

  for (const waba of wabas.data || []) {
    let phoneNumbers = waba.phone_numbers?.data || []
    if (!phoneNumbers.length && waba.id) {
      const phones = await getWabaPhoneNumbers(String(waba.id), accessToken)
      phoneNumbers = phones.data || []
    }

    const phone = phoneNumbers[0]
    if (phone?.id) {
      return {
        businessId: String(business.id),
        wabaId: String(waba.id),
        phoneNumberId: String(phone.id),
        displayPhoneNumber: phone.display_phone_number || phone.verified_name || null,
        edgeName,
      }
    }
  }

  return null
}

async function resolveWabaFromId(wabaId: string, accessToken: string) {
  const waba = await graphGet<any>(`/${wabaId}`, accessToken, {
    fields: 'id,name,phone_numbers{id,display_phone_number,verified_name}',
  }).catch(() => null)

  let phoneNumbers = waba?.phone_numbers?.data || []
  if (!phoneNumbers.length) {
    const phones = await getWabaPhoneNumbers(wabaId, accessToken)
    phoneNumbers = phones.data || []
  }

  const phone = phoneNumbers[0]
  if (!phone?.id) return null

  return {
    businessId: null,
    wabaId: String(waba?.id || wabaId),
    phoneNumberId: String(phone.id),
    displayPhoneNumber: phone.display_phone_number || phone.verified_name || null,
    edgeName: 'debug_token.granular_scopes',
  }
}

async function resolveMetaWhatsappAccount(accessToken: string, officialMode: WhatsAppOfficialMode) {
  const businesses = await graphGet<{ data?: any[] }>('/me/businesses', accessToken, {
    fields: 'id,name',
  }).catch(() => ({ data: [] }))

  const edgeNames = officialMode === 'coexistence'
    ? ['client_whatsapp_business_accounts', 'owned_whatsapp_business_accounts']
    : ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']

  for (const business of businesses.data || []) {
    for (const edgeName of edgeNames) {
      const account = await resolveWabaFromEdge(business, edgeName, accessToken)
      if (account) return account
    }
  }

  const targetWabaIds = await getWabaIdsFromDebugToken(accessToken)
  for (const wabaId of targetWabaIds) {
    const account = await resolveWabaFromId(wabaId, accessToken)
    if (account) return account
  }

  throw new Error('Nenhum numero de WhatsApp Business foi retornado pela Meta para esta autorizacao. Confirme se o onboarding compartilhou o WABA e o numero com o app do SellClin.')
}

export function buildMetaConnectUrl(
  companyId: number,
  userId?: number | null,
  officialMode: WhatsAppOfficialMode = 'cloud_api',
) {
  const { appId, configId, redirectUri } = requireMetaEnv(officialMode)
  const state = jwt.sign(
    { companyId, userId, officialMode } satisfies MetaStatePayload,
    getJwtSecret(),
    { expiresIn: '20m' },
  )
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('override_default_response_type', 'true')
  url.searchParams.set('config_id', configId)
  url.searchParams.set('scope', 'business_management,whatsapp_business_management,whatsapp_business_messaging')

  if (officialMode === 'coexistence') {
    const solutionId = cleanOptional(
      process.env.META_WHATSAPP_COEXISTENCE_SOLUTION_ID ||
      process.env.META_WHATSAPP_SOLUTION_ID,
    )
    const setup = solutionId ? { solutionID: solutionId } : {}
    url.searchParams.set('extras', JSON.stringify({
      setup,
      featureType: 'whatsapp_business_app_onboarding',
      sessionInfoVersion: '3',
      version: 'v3',
    }))
  }

  return url.toString()
}

export function verifyMetaState(state: string): MetaStatePayload {
  const payload = jwt.verify(state, getJwtSecret()) as Partial<MetaStatePayload> & Pick<MetaStatePayload, 'companyId'>
  return {
    companyId: payload.companyId,
    userId: payload.userId,
    officialMode: payload.officialMode === 'coexistence' ? 'coexistence' : 'cloud_api',
  }
}

export async function connectMetaWhatsappFromCode(code: string, state: string) {
  const payload = verifyMetaState(state)
  const accessToken = await exchangeCodeForToken(code)
  const account = await resolveMetaWhatsappAccount(accessToken, payload.officialMode)
  const company = await prisma.empresa.findUnique({
    where: { id: payload.companyId },
    select: { webhookToken: true, metaWebhookVerifyToken: true },
  })
  if (!company?.webhookToken) throw new Error('Empresa nao encontrada para configurar o webhook.')

  const webhookVerifyToken = createWebhookVerifyToken(company.metaWebhookVerifyToken)
  const webhookUrl = buildMetaWebhookUrl(company.webhookToken)

  // Meta validates the callback during subscribed_apps. Persist the token first
  // so the verification request can be answered while this call is in flight.
  await prisma.empresa.update({
    where: { id: payload.companyId },
    data: { metaWebhookVerifyToken: webhookVerifyToken },
  })
  const webhookSubscription = await subscribeWhatsappApp(account.wabaId, accessToken, {
    callbackUrl: webhookUrl,
    verifyToken: webhookVerifyToken,
  })

  const updated = await prisma.empresa.update({
    where: { id: payload.companyId },
    data: {
      whatsappProvider: 'meta',
      metaToken: accessToken,
      metaPhoneNumberId: account.phoneNumberId,
      metaWabaId: account.wabaId,
      metaBusinessId: account.businessId,
      metaPhoneDisplayNumber: account.displayPhoneNumber,
      metaWebhookVerifyToken: webhookVerifyToken,
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

  await upsertMetaConnection({
    companyId: payload.companyId,
    officialMode: payload.officialMode,
    status: 'connected',
    phoneNumberId: account.phoneNumberId,
    wabaId: account.wabaId,
    businessId: account.businessId,
    displayPhoneNumber: account.displayPhoneNumber,
    accessToken,
    webhookVerifyToken,
    connectedAt: updated.metaConnectedAt,
    metadata: {
      onboarding: 'embedded_signup',
      edgeName: account.edgeName,
      webhookCallbackUrl: webhookUrl,
      webhookOverrideVerified: webhookSubscription?.overrideVerified === true,
    },
  })

  return { ...updated, officialMode: payload.officialMode }
}

export async function getMetaWhatsappStatus(companyId: number) {
  const connection = await getWhatsAppConnection(companyId)
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
  const connectionMetadata = connection?.metadata && typeof connection.metadata === 'object'
    ? connection.metadata as Record<string, unknown>
    : {}
  const expectedWebhookUrl = buildMetaWebhookUrl(company.webhookToken)
  const webhookConfigured = connectionMetadata.webhookOverrideVerified === true
    && connectionMetadata.webhookCallbackUrl === expectedWebhookUrl
  const lastWebhookEvent = await prisma.whatsAppWebhookEvent.findFirst({
    where: { companyId, provider: 'meta' },
    orderBy: { createdAt: 'desc' },
    select: {
      eventType: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      processedAt: true,
    },
  })

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
    webhookUrl: expectedWebhookUrl,
    webhookConfigured,
    lastWebhookEvent,
    connectedAt: company.metaConnectedAt,
    officialMode: connection?.provider === 'meta' ? (connection.officialMode || 'cloud_api') : 'cloud_api',
    coexistenceEnabled: isCoexistenceEnabled(),
    coexistenceConfigured: Boolean(process.env.META_WHATSAPP_COEXISTENCE_CONFIG_ID),
    graphVersion: GRAPH_VERSION,
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

  const effectiveAccessToken = accessToken || current.metaToken
  if (!effectiveAccessToken) {
    throw new Error('Permanent Access Token e obrigatorio para habilitar o recebimento de mensagens.')
  }

  const webhookUrl = buildMetaWebhookUrl(current.webhookToken)
  await prisma.empresa.update({
    where: { id: companyId },
    data: { metaWebhookVerifyToken: webhookVerifyToken },
  })
  const webhookSubscription = await subscribeWhatsappApp(wabaId, effectiveAccessToken, {
    callbackUrl: webhookUrl,
    verifyToken: webhookVerifyToken,
  })

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

  await upsertMetaConnection({
    companyId,
    officialMode: 'cloud_api',
    status: 'connected',
    phoneNumberId,
    wabaId,
    businessId: cleanOptional(input.businessId),
    displayPhoneNumber: cleanOptional(input.displayPhoneNumber),
    accessToken: effectiveAccessToken,
    webhookVerifyToken,
    connectedAt: updated.metaConnectedAt,
    metadata: {
      onboarding: 'manual',
      webhookCallbackUrl: webhookUrl,
      webhookOverrideVerified: webhookSubscription?.overrideVerified === true,
    },
  })

  return {
    ...updated,
    webhookUrl: buildMetaWebhookUrl(updated.webhookToken),
    hasAccessToken: true,
  }
}

export async function repairMetaWhatsappWebhook(companyId: number) {
  const [company, connection] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        webhookToken: true,
        metaToken: true,
        metaPhoneNumberId: true,
        metaWabaId: true,
        metaBusinessId: true,
        metaPhoneDisplayNumber: true,
        metaWebhookVerifyToken: true,
        metaConnectedAt: true,
      },
    }),
    getWhatsAppConnection(companyId),
  ])

  if (!company?.metaToken || !company.metaWabaId || !company.webhookToken) {
    throw new Error('Conexao Meta incompleta. Conecte o WhatsApp novamente.')
  }

  const webhookVerifyToken = createWebhookVerifyToken(company.metaWebhookVerifyToken)
  const webhookUrl = buildMetaWebhookUrl(company.webhookToken)
  await prisma.empresa.update({
    where: { id: companyId },
    data: { metaWebhookVerifyToken: webhookVerifyToken },
  })
  const subscription = await subscribeWhatsappApp(company.metaWabaId, company.metaToken, {
    callbackUrl: webhookUrl,
    verifyToken: webhookVerifyToken,
  })
  const currentMetadata = connection?.metadata && typeof connection.metadata === 'object'
    ? connection.metadata as Record<string, unknown>
    : {}

  await upsertMetaConnection({
    companyId,
    officialMode: connection?.officialMode === 'coexistence' ? 'coexistence' : 'cloud_api',
    status: 'connected',
    phoneNumberId: company.metaPhoneNumberId,
    wabaId: company.metaWabaId,
    businessId: company.metaBusinessId,
    displayPhoneNumber: company.metaPhoneDisplayNumber,
    accessToken: company.metaToken,
    webhookVerifyToken,
    connectedAt: company.metaConnectedAt,
    metadata: {
      ...currentMetadata,
      webhookCallbackUrl: webhookUrl,
      webhookOverrideVerified: subscription?.overrideVerified === true,
      webhookRepairedAt: new Date().toISOString(),
    },
  })

  return {
    webhookUrl,
    webhookConfigured: subscription?.overrideVerified === true,
  }
}

export async function disconnectMetaWhatsapp(companyId: number) {
  const updated = await prisma.empresa.update({
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

  await clearMetaConnection(companyId)
  return updated
}
