import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import {
  connectUazapi,
  disconnectUazapi,
  getUazapiStatus,
  setupUazapiWebhook,
} from '../services/uazapi-whatsapp.js'

export const router = Router()

function getCompanyId(req: any) {
  return Number(req.user?.companyId) || undefined
}

router.get('/status', auth(), async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await getUazapiStatus(companyId)))
  } catch (error: any) {
    console.error('[UAZAPI Status] Erro:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao consultar UAZAPI', 500))
  }
})

router.post('/connect', auth(), async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await connectUazapi(companyId, req.body?.phone)))
  } catch (error: any) {
    console.error('[UAZAPI Connect] Erro:', error)
    return res.status(400).json(createErrorResponse(error.message || 'Erro ao conectar UAZAPI', 400))
  }
})

router.post('/webhook/setup', auth(), async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await setupUazapiWebhook(companyId)))
  } catch (error: any) {
    console.error('[UAZAPI Webhook] Erro:', error)
    return res.status(400).json(createErrorResponse(error.message || 'Erro ao configurar webhook UAZAPI', 400))
  }
})

router.post('/disconnect', auth(), async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await disconnectUazapi(companyId)))
  } catch (error: any) {
    console.error('[UAZAPI Disconnect] Erro:', error)
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao desconectar UAZAPI', 500))
  }
})
