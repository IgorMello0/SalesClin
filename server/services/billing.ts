import crypto from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '../prisma.js'

type PrismaExecutor = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export const TRIAL_DAYS = 15
export const PLAN_CODES = ['start', 'pro', 'enterprise'] as const
export const BILLING_CYCLES = ['monthly', 'yearly'] as const
export type PlanCode = typeof PLAN_CODES[number]
export type BillingCycle = typeof BILLING_CYCLES[number]

export const OPERATIONAL_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active'])
export const ALWAYS_ALLOWED_MODULES = new Set(['dashboard'])

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === 'string' && PLAN_CODES.includes(value as PlanCode)
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return typeof value === 'string' && BILLING_CYCLES.includes(value as BillingCycle)
}

export function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function getEffectiveSubscriptionStatus(subscription: {
  status: string
  trialEndsAt: Date
}) {
  if (subscription.status === 'trialing' && subscription.trialEndsAt.getTime() < Date.now()) {
    return 'expired'
  }

  return subscription.status
}

export function getDaysRemaining(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

export async function ensureCompanySubscription(
  db: PrismaExecutor,
  companyId: number,
  planCode: PlanCode = 'start',
  billingCycle: BillingCycle = 'monthly'
) {
  const subscription = await db.companySubscription.findUnique({
    where: { companyId },
  })

  if (subscription) {
    const normalizedPlan = isPlanCode(subscription.planCode) ? subscription.planCode : planCode
    if (subscription.planCode !== normalizedPlan) {
      await db.companySubscription.update({
        where: { companyId },
        data: { planCode: normalizedPlan },
      })
    }
    return subscription
  }

  const trialEndsAt = addDays(new Date(), TRIAL_DAYS)

  const created = await db.companySubscription.create({
      data: {
        companyId,
        planCode,
        billingCycle,
        status: 'trialing',
        trialEndsAt,
      },
  })

  await db.empresa.update({
    where: { id: companyId },
    data: { plan: planCode },
  })

  return created
}

export async function getCompanyBillingStatus(companyId: number) {
  const subscription = await ensureCompanySubscription(prisma, companyId)
  const effectiveStatus = getEffectiveSubscriptionStatus(subscription)

  if (effectiveStatus === 'expired' && subscription.status !== 'expired') {
    await prisma.companySubscription.update({
      where: { companyId },
      data: { status: 'expired' },
    })
  }

  const planModules = await prisma.planModule.findMany({
    where: { planCode: subscription.planCode },
    include: { module: true },
    orderBy: { moduleId: 'asc' },
  })

  const modules = planModules.map(({ module }) => ({
    code: module.code,
    name: module.name,
    icon: module.icon,
  }))

  return {
    planCode: subscription.planCode,
    status: effectiveStatus,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEndsAt: subscription.currentPeriodEndsAt,
    billingCycle: isBillingCycle(subscription.billingCycle) ? subscription.billingCycle : 'monthly',
    daysRemaining: getDaysRemaining(subscription.trialEndsAt),
    modules,
    abacateSubscriptionId: subscription.abacateSubscriptionId,
    abacateCheckoutId: subscription.abacateCheckoutId,
    checkoutUrl: subscription.checkoutUrl,
  }
}

export async function getCompanyModuleEntitlements(companyId?: number | null) {
  if (!companyId) {
    return {
      planCode: 'start',
      subscriptionStatus: 'active',
      moduleCodes: new Set<string>(),
      hasKnownCompany: false,
    }
  }

  const status = await getCompanyBillingStatus(companyId)
  const moduleCodes = new Set(status.modules.map((module) => module.code))

  return {
    planCode: status.planCode,
    subscriptionStatus: status.status,
    moduleCodes,
    hasKnownCompany: true,
  }
}

export async function canCompanyAccessModule(companyId: number | null | undefined, moduleCode: string) {
  if (ALWAYS_ALLOWED_MODULES.has(moduleCode)) {
    const status = companyId ? await getCompanyBillingStatus(companyId) : undefined
    return {
      hasAccess: true,
      blockedByPlan: false,
      planCode: status?.planCode || 'start',
      subscriptionStatus: status?.status || 'active',
    }
  }

  const entitlements = await getCompanyModuleEntitlements(companyId)
  const statusAllowsUsage = OPERATIONAL_SUBSCRIPTION_STATUSES.has(entitlements.subscriptionStatus)
  const planIncludesModule = !entitlements.hasKnownCompany || entitlements.moduleCodes.has(moduleCode)

  return {
    hasAccess: statusAllowsUsage && planIncludesModule,
    blockedByPlan: !statusAllowsUsage || !planIncludesModule,
    planCode: entitlements.planCode,
    subscriptionStatus: entitlements.subscriptionStatus,
  }
}

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    'https://sellclin.com'
  ).replace(/\/$/, '')
}

export function getPeriodEndForCycle(cycle: BillingCycle, baseDate = new Date()) {
  return addDays(baseDate, cycle === 'yearly' ? 365 : 30)
}

export function getProductIdForPlan(planCode: PlanCode, billingCycle: BillingCycle) {
  if (planCode === 'start') {
    return billingCycle === 'yearly'
      ? process.env.ABACATEPAY_START_YEARLY_PRODUCT_ID
      : process.env.ABACATEPAY_START_MONTHLY_PRODUCT_ID || process.env.ABACATEPAY_START_PRODUCT_ID
  }

  if (planCode === 'pro') {
    return billingCycle === 'yearly'
      ? process.env.ABACATEPAY_PRO_YEARLY_PRODUCT_ID
      : process.env.ABACATEPAY_PRO_MONTHLY_PRODUCT_ID || process.env.ABACATEPAY_PRO_PRODUCT_ID
  }

  return undefined
}

export async function createAbacateSubscriptionCheckout(
  companyId: number,
  planCode: PlanCode,
  billingCycle: BillingCycle = 'monthly'
) {
  if (planCode === 'enterprise') {
    throw new Error('O plano Enterprise e gerenciado manualmente.')
  }

  const apiKey = process.env.ABACATEPAY_API_KEY
  const productId = getProductIdForPlan(planCode, billingCycle)

  if (!apiKey || !productId) {
    throw new Error('Configuracao da Abacate Pay incompleta para criar checkout.')
  }

  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    include: { subscription: true, owner: true },
  })

  if (!company) {
    throw new Error('Clinica nao encontrada.')
  }

  const subscription = company.subscription || await ensureCompanySubscription(prisma, companyId, planCode)
  const appUrl = getPublicAppUrl()
  const externalId = `sellclin-${companyId}-${Date.now()}`
  const baseUrl = process.env.ABACATEPAY_API_BASE_URL || 'https://api.abacatepay.com/v2'

  const payload = {
    items: [{ id: productId, quantity: 1 }],
    externalId,
    returnUrl: `${appUrl}/dashboard?billing=return`,
    completionUrl: `${appUrl}/dashboard?billing=success`,
    methods: ['CARD'],
    metadata: {
      companyId: String(companyId),
      planCode,
      billingCycle,
      subscriptionId: String(subscription.id),
    },
  }

  const response = await fetch(`${baseUrl}/subscriptions/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body?.success === false) {
    const message = body?.error?.message || body?.error || 'Nao foi possivel criar checkout na Abacate Pay.'
    throw new Error(message)
  }

  const data = body?.data || body
  const checkoutId = data?.id || data?.checkoutId || null
  const checkoutUrl = data?.url || data?.checkoutUrl || data?.paymentUrl || null

  if (!checkoutUrl) {
    throw new Error('A Abacate Pay nao retornou a URL do checkout.')
  }

  await prisma.companySubscription.update({
    where: { companyId },
    data: {
      planCode,
      billingCycle,
      status: getEffectiveSubscriptionStatus(subscription) === 'expired' ? 'payment_pending' : subscription.status,
      abacateCheckoutId: checkoutId,
      checkoutUrl,
    },
  })

  await prisma.empresa.update({
    where: { id: companyId },
    data: { plan: planCode },
  })

  return {
    checkoutId,
    checkoutUrl,
  }
}

export function verifyAbacateWebhookSignature(rawBody: string, signature: string | undefined) {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET
  if (!secret) return true
  if (!signature) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64')

  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

export async function markWebhookEventProcessed(eventId: string, eventType: string | undefined, payload: any) {
  try {
    await prisma.billingWebhookEvent.create({
      data: {
        eventId,
        eventType,
        payload,
      },
    })

    return true
  } catch (error: any) {
    if (error?.code === 'P2002') return false
    throw error
  }
}
