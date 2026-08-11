import { prisma } from '../prisma.js'

export type WhatsAppOfficialMode = 'cloud_api' | 'coexistence'

const DEFAULT_COEXISTENCE_TEST_EMAILS = [
  'igormello403@gmail.com',
  'crmsellclin@gmail.com',
]

function normalizedEmails(value?: string) {
  return String(value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isCoexistenceEnabled() {
  return String(process.env.WHATSAPP_COEXISTENCE_ENABLED || '').toLowerCase() === 'true'
}

export function isCoexistenceAllowed(email?: string | null) {
  if (!isCoexistenceEnabled()) return false

  const restrictToTestEmails = String(process.env.WHATSAPP_COEXISTENCE_RESTRICT_EMAILS || '').toLowerCase() === 'true'
  if (!restrictToTestEmails) return true

  const allowlist = normalizedEmails(process.env.WHATSAPP_COEXISTENCE_TEST_EMAILS)
  const allowedEmails = allowlist.length ? allowlist : DEFAULT_COEXISTENCE_TEST_EMAILS
  return Boolean(email && allowedEmails.includes(email.trim().toLowerCase()))
}

export async function getWhatsAppConnection(companyId: number) {
  const existing = await prisma.whatsAppConnection.findUnique({ where: { companyId } })
  if (existing) return existing

  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: {
      whatsappProvider: true,
      metaToken: true,
      metaPhoneNumberId: true,
      metaWabaId: true,
      metaBusinessId: true,
      metaPhoneDisplayNumber: true,
      metaWebhookVerifyToken: true,
      metaConnectionStatus: true,
      metaConnectedAt: true,
      uazapiInstanceId: true,
      uazapiInstanceName: true,
      uazapiToken: true,
      uazapiConnectionStatus: true,
      uazapiConnectedAt: true,
    },
  })

  if (!company) throw new Error('Empresa nao encontrada.')

  if (company.whatsappProvider === 'meta' && (company.metaPhoneNumberId || company.metaToken)) {
    return prisma.whatsAppConnection.create({
      data: {
        companyId,
        provider: 'meta',
        officialMode: 'cloud_api',
        status: company.metaConnectionStatus || 'connected',
        phoneNumberId: company.metaPhoneNumberId,
        wabaId: company.metaWabaId,
        businessId: company.metaBusinessId,
        displayPhoneNumber: company.metaPhoneDisplayNumber,
        accessToken: company.metaToken,
        webhookVerifyToken: company.metaWebhookVerifyToken,
        connectedAt: company.metaConnectedAt,
      },
    })
  }

  if (company.whatsappProvider === 'uazapi' && (company.uazapiInstanceId || company.uazapiToken)) {
    return prisma.whatsAppConnection.create({
      data: {
        companyId,
        provider: 'unofficial',
        status: company.uazapiConnectionStatus || 'disconnected',
        externalInstanceId: company.uazapiInstanceId,
        externalInstanceName: company.uazapiInstanceName,
        accessToken: company.uazapiToken,
        connectedAt: company.uazapiConnectedAt,
      },
    })
  }

  return null
}

export async function upsertMetaConnection(input: {
  companyId: number
  officialMode: WhatsAppOfficialMode
  status?: string | null
  phoneNumberId?: string | null
  wabaId?: string | null
  businessId?: string | null
  displayPhoneNumber?: string | null
  accessToken?: string | null
  webhookVerifyToken?: string | null
  connectedAt?: Date | null
  metadata?: Record<string, unknown> | null
}) {
  return prisma.whatsAppConnection.upsert({
    where: { companyId: input.companyId },
    create: {
      companyId: input.companyId,
      provider: 'meta',
      officialMode: input.officialMode,
      status: input.status || 'connected',
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      businessId: input.businessId,
      displayPhoneNumber: input.displayPhoneNumber,
      accessToken: input.accessToken,
      webhookVerifyToken: input.webhookVerifyToken,
      connectedAt: input.connectedAt || new Date(),
      metadata: (input.metadata || undefined) as any,
      lastSyncedAt: new Date(),
    },
    update: {
      provider: 'meta',
      officialMode: input.officialMode,
      status: input.status || 'connected',
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      businessId: input.businessId,
      displayPhoneNumber: input.displayPhoneNumber,
      ...(input.accessToken ? { accessToken: input.accessToken } : {}),
      webhookVerifyToken: input.webhookVerifyToken,
      connectedAt: input.connectedAt || new Date(),
      metadata: (input.metadata || undefined) as any,
      lastSyncedAt: new Date(),
    },
  })
}

export async function clearMetaConnection(companyId: number) {
  const existing = await prisma.whatsAppConnection.findUnique({ where: { companyId } })
  if (!existing || existing.provider !== 'meta') return null

  return prisma.whatsAppConnection.update({
    where: { companyId },
    data: {
      status: 'disconnected',
      phoneNumberId: null,
      wabaId: null,
      businessId: null,
      displayPhoneNumber: null,
      accessToken: null,
      webhookVerifyToken: null,
      connectedAt: null,
      lastSyncedAt: new Date(),
    },
  })
}
