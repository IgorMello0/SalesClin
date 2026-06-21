import { Router } from 'express'
import { auth, requireCompany } from '../middleware/auth.js'
import { prisma } from '../prisma.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import {
  createAbacateSubscriptionCheckout,
  getCompanyBillingStatus,
  isBillingCycle,
  isPlanCode,
} from '../services/billing.js'

export const router = Router()

router.get('/status', auth(), requireCompany, async (req, res) => {
  try {
    const companyId = req.user!.companyId!
    const status = await getCompanyBillingStatus(companyId)
    return res.json(createSuccessResponse(status))
  } catch (error: any) {
    console.error('[Billing] Erro ao buscar status:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar assinatura', 500))
  }
})

router.post('/checkout', auth(), requireCompany, async (req, res) => {
  try {
    const companyId = req.user!.companyId!
    const requestedPlanCode = req.body?.planCode
    const requestedBillingCycle = req.body?.billingCycle

    if (requestedPlanCode && !isPlanCode(requestedPlanCode)) {
      return res.status(400).json(createErrorResponse('Plano invalido', 400))
    }

    const currentStatus = await getCompanyBillingStatus(companyId)
    const planCode = requestedPlanCode || currentStatus.planCode
    const billingCycle = isBillingCycle(requestedBillingCycle)
      ? requestedBillingCycle
      : currentStatus.billingCycle || 'monthly'

    if (planCode === 'enterprise') {
      return res.status(400).json(createErrorResponse('Plano Enterprise e gerenciado manualmente', 400))
    }

    const checkout = await createAbacateSubscriptionCheckout(companyId, planCode, billingCycle)
    return res.json(createSuccessResponse(checkout))
  } catch (error: any) {
    console.error('[Billing] Erro ao criar checkout:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao criar checkout', 500))
  }
})

router.post('/select-plan', auth(), requireCompany, async (req, res) => {
  try {
    const companyId = req.user!.companyId!
    const requestedPlanCode = req.body?.planCode
    const requestedBillingCycle = req.body?.billingCycle || 'monthly'

    if (!isPlanCode(requestedPlanCode)) {
      return res.status(400).json(createErrorResponse('Plano invalido', 400))
    }

    if (!isBillingCycle(requestedBillingCycle)) {
      return res.status(400).json(createErrorResponse('Ciclo de cobranca invalido', 400))
    }

    if (requestedPlanCode === 'enterprise') {
      return res.status(400).json(createErrorResponse('Plano Enterprise e gerenciado manualmente', 400))
    }

    const subscription = await prisma.companySubscription.findUnique({
      where: { companyId },
    })

    if (!subscription || !['trialing', 'expired', 'payment_pending'].includes(subscription.status)) {
      return res.status(400).json(createErrorResponse('Este plano deve ser alterado pelo checkout', 400))
    }

    const updated = await prisma.companySubscription.update({
      where: { companyId },
      data: {
        planCode: requestedPlanCode,
        billingCycle: requestedBillingCycle,
      },
    })

    await prisma.empresa.update({
      where: { id: companyId },
      data: { plan: requestedPlanCode },
    })

    return res.json(createSuccessResponse({
      planCode: updated.planCode,
      billingCycle: updated.billingCycle,
      status: updated.status,
    }))
  } catch (error: any) {
    console.error('[Billing] Erro ao selecionar plano:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao selecionar plano', 500))
  }
})

router.post('/cancel-trial', auth(), requireCompany, async (req, res) => {
  try {
    const companyId = req.user!.companyId!
    const subscription = await prisma.companySubscription.findUnique({
      where: { companyId },
    })

    if (!subscription) {
      return res.status(404).json(createErrorResponse('Assinatura nao encontrada', 404))
    }

    if (!['trialing', 'payment_pending', 'expired'].includes(subscription.status)) {
      return res.status(400).json(createErrorResponse('Esta assinatura nao pode ser cancelada por esta acao', 400))
    }

    const updated = await prisma.companySubscription.update({
      where: { companyId },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    })

    return res.json(createSuccessResponse({
      planCode: updated.planCode,
      status: updated.status,
      canceledAt: updated.canceledAt,
    }))
  } catch (error: any) {
    console.error('[Billing] Erro ao cancelar teste:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao cancelar teste', 500))
  }
})
