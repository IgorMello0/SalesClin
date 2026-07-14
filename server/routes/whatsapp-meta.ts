import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import {
  buildMetaConnectUrl,
  connectMetaWhatsappFromCode,
  disconnectMetaWhatsapp,
  getMetaWhatsappStatus,
  saveManualMetaWhatsappConfig,
} from '../services/meta-whatsapp.js'

export const router = Router()

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    'https://sellclin.com'
  ).replace(/\/$/, '')
}

async function getRequestCompanyId(req: any) {
  if (req.user?.type === 'profissional') {
    const prof = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { companyId: true },
    })
    return prof?.companyId || undefined
  }

  if (req.user?.type === 'usuario') {
    return req.user.companyId || undefined
  }

  return undefined
}

router.get('/connect', auth(), async (req, res) => {
  try {
    const companyId = await getRequestCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Empresa nao encontrada', 404))

    const url = buildMetaConnectUrl(companyId, req.user?.id || null)
    return res.json(createSuccessResponse({ url }))
  } catch (error: any) {
    console.error('[WhatsApp Meta Connect] Erro:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao iniciar conexao com a Meta', 500))
  }
})

router.get('/callback', async (req, res) => {
  const appUrl = getPublicAppUrl()
  const code = String(req.query.code || '')
  const state = String(req.query.state || '')
  const error = req.query.error || req.query.error_reason

  if (error) {
    return res.redirect(`${appUrl}/settings?view=whatsapp&whatsappMeta=error`)
  }

  if (!code || !state) {
    return res.redirect(`${appUrl}/settings?view=whatsapp&whatsappMeta=error`)
  }

  try {
    await connectMetaWhatsappFromCode(code, state)
    return res.redirect(`${appUrl}/settings?view=whatsapp&whatsappMeta=connected`)
  } catch (err: any) {
    console.error('[WhatsApp Meta Callback] Erro:', err)
    return res.redirect(`${appUrl}/settings?view=whatsapp&whatsappMeta=error`)
  }
})

router.get('/status', auth(), async (req, res) => {
  try {
    const companyId = await getRequestCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Empresa nao encontrada', 404))

    const status = await getMetaWhatsappStatus(companyId)
    return res.json(createSuccessResponse(status))
  } catch (error: any) {
    console.error('[WhatsApp Meta Status] Erro:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar status da Meta', 500))
  }
})

router.post('/configure', auth(), async (req, res) => {
  try {
    const companyId = await getRequestCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Empresa nao encontrada', 404))

    const result = await saveManualMetaWhatsappConfig(companyId, {
      phoneNumberId: req.body?.phoneNumberId,
      wabaId: req.body?.wabaId,
      businessId: req.body?.businessId,
      accessToken: req.body?.accessToken,
      webhookVerifyToken: req.body?.webhookVerifyToken,
      twoStepPin: req.body?.twoStepPin,
      displayPhoneNumber: req.body?.displayPhoneNumber,
    })

    return res.json(createSuccessResponse(result))
  } catch (error: any) {
    console.error('[WhatsApp Meta Configure] Erro:', error)
    return res.status(400).json(createErrorResponse(error.message || 'Erro ao salvar configuracao Meta', 400))
  }
})

router.post('/disconnect', auth(), async (req, res) => {
  try {
    const companyId = await getRequestCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Empresa nao encontrada', 404))

    const result = await disconnectMetaWhatsapp(companyId)
    return res.json(createSuccessResponse(result))
  } catch (error: any) {
    console.error('[WhatsApp Meta Disconnect] Erro:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao desconectar Meta', 500))
  }
})
