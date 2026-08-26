import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'

export const MESSAGE_DISPATCH_PRICE_CENTS = Number(process.env.MESSAGE_DISPATCH_PRICE_CENTS || 5)
export const MESSAGE_CREDIT_CURRENCY = 'BRL'

type PrismaExecutor = typeof prisma | Prisma.TransactionClient

export class MessageCreditError extends Error {
  status = 402
  code = 'INSUFFICIENT_MESSAGE_CREDITS'
  balanceCents: number
  requiredCents: number

  constructor(balanceCents: number, requiredCents: number) {
    super('Saldo insuficiente para iniciar este disparo.')
    this.name = 'MessageCreditError'
    this.balanceCents = balanceCents
    this.requiredCents = requiredCents
  }
}

export function estimateMessageCreditCost(recipientCount: number, unitCostCents = MESSAGE_DISPATCH_PRICE_CENTS) {
  const safeCount = Math.max(0, Number.isFinite(recipientCount) ? Math.floor(recipientCount) : 0)
  const safeUnitCost = Math.max(0, Number.isFinite(unitCostCents) ? Math.floor(unitCostCents) : MESSAGE_DISPATCH_PRICE_CENTS)
  return {
    recipientCount: safeCount,
    unitCostCents: safeUnitCost,
    totalCostCents: safeCount * safeUnitCost,
    currency: MESSAGE_CREDIT_CURRENCY,
  }
}

export async function ensureMessageCreditWallet(companyId: number, executor: PrismaExecutor = prisma) {
  return executor.messageCreditWallet.upsert({
    where: { companyId },
    create: { companyId, currency: MESSAGE_CREDIT_CURRENCY },
    update: {},
  })
}

export async function getMessageCreditSummary(companyId: number) {
  const wallet = await ensureMessageCreditWallet(companyId)
  const availableMessages = MESSAGE_DISPATCH_PRICE_CENTS > 0
    ? Math.floor(wallet.balanceCents / MESSAGE_DISPATCH_PRICE_CENTS)
    : 0

  return {
    balanceCents: wallet.balanceCents,
    currency: wallet.currency,
    unitCostCents: MESSAGE_DISPATCH_PRICE_CENTS,
    availableMessages,
  }
}

export async function reserveCampaignCredits(input: {
  companyId: number
  campaignId: number
  recipientCount: number
}) {
  const estimate = estimateMessageCreditCost(input.recipientCount)
  if (estimate.totalCostCents <= 0) return { ...estimate, balanceCents: 0 }

  return prisma.$transaction(async (tx) => {
    const idempotencyKey = `campaign:${input.campaignId}:reserve`
    const existing = await tx.messageCreditTransaction.findUnique({ where: { idempotencyKey } })
    const wallet = await ensureMessageCreditWallet(input.companyId, tx)

    if (existing) {
      return { ...estimate, balanceCents: existing.balanceAfterCents }
    }

    const updated = await tx.messageCreditWallet.updateMany({
      where: {
        companyId: input.companyId,
        balanceCents: { gte: estimate.totalCostCents },
      },
      data: {
        balanceCents: { decrement: estimate.totalCostCents },
      },
    })

    if (updated.count === 0) {
      throw new MessageCreditError(wallet.balanceCents, estimate.totalCostCents)
    }

    const nextWallet = await tx.messageCreditWallet.findUniqueOrThrow({ where: { companyId: input.companyId } })
    await tx.messageCreditTransaction.create({
      data: {
        companyId: input.companyId,
        walletId: nextWallet.id,
        campaignId: input.campaignId,
        type: 'campaign_reserve',
        amountCents: -estimate.totalCostCents,
        balanceAfterCents: nextWallet.balanceCents,
        description: `Reserva de ${estimate.recipientCount} disparo(s)`,
        metadata: estimate,
        idempotencyKey,
      },
    })

    await tx.messageCampaign.update({
      where: { id: input.campaignId },
      data: {
        messageUnitCostCents: estimate.unitCostCents,
        creditReservedCents: estimate.totalCostCents,
        creditSpentCents: 0,
        creditRefundedCents: 0,
      },
    })

    return { ...estimate, balanceCents: nextWallet.balanceCents }
  })
}

export async function refundUnusedCampaignCredits(campaignId: number) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.messageCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        companyId: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        messageUnitCostCents: true,
        creditReservedCents: true,
        creditRefundedCents: true,
      },
    })

    if (!campaign || campaign.creditReservedCents <= 0) return null

    const spentCents = Math.max(0, campaign.sentCount * campaign.messageUnitCostCents)
    const refundableCents = Math.max(0, campaign.creditReservedCents - spentCents - campaign.creditRefundedCents)
    if (refundableCents <= 0) {
      await tx.messageCampaign.update({
        where: { id: campaignId },
        data: { creditSpentCents: spentCents },
      })
      return null
    }

    const idempotencyKey = `campaign:${campaignId}:refund:${campaign.creditRefundedCents + refundableCents}`
    const existing = await tx.messageCreditTransaction.findUnique({ where: { idempotencyKey } })
    if (existing) return existing

    const wallet = await ensureMessageCreditWallet(campaign.companyId, tx)
    const nextWallet = await tx.messageCreditWallet.update({
      where: { companyId: campaign.companyId },
      data: { balanceCents: { increment: refundableCents } },
    })

    const transaction = await tx.messageCreditTransaction.create({
      data: {
        companyId: campaign.companyId,
        walletId: wallet.id,
        campaignId,
        type: 'campaign_refund',
        amountCents: refundableCents,
        balanceAfterCents: nextWallet.balanceCents,
        description: `Devolucao de disparos nao enviados/falhos`,
        metadata: {
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
          totalRecipients: campaign.totalRecipients,
          unitCostCents: campaign.messageUnitCostCents,
        },
        idempotencyKey,
      },
    })

    await tx.messageCampaign.update({
      where: { id: campaignId },
      data: {
        creditSpentCents: spentCents,
        creditRefundedCents: { increment: refundableCents },
      },
    })

    return transaction
  })
}
