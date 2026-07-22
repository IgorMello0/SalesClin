import { Router } from 'express'
import { auth, requireCompanyOwner, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import {
  connectUazapi,
  disconnectUazapi,
  getUazapiStatus,
  setupUazapiWebhook,
} from '../services/uazapi-whatsapp.js'

export const router = Router()
const ownerOnly = [auth(), requireModule('conversas'), requireCompanyOwner()]

function getCompanyId(req: any) {
  return Number(req.user?.companyId) || undefined
}

router.get('/status', auth(), requireModule('conversas'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await getUazapiStatus(companyId)))
  } catch (error: any) {
    console.error('[UAZAPI Status] Erro:', error)
    return res.status(500).json(createErrorResponse('Nao foi possivel consultar a conexao do WhatsApp', 500))
  }
})

router.post('/connect', ...ownerOnly, async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await connectUazapi(companyId, req.body?.phone)))
  } catch (error: any) {
    console.error('[UAZAPI Connect] Erro:', error)
    return res.status(400).json(createErrorResponse('Nao foi possivel conectar o WhatsApp. Tente novamente.', 400))
  }
})

router.post('/webhook/setup', ...ownerOnly, async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await setupUazapiWebhook(companyId)))
  } catch (error: any) {
    console.error('[UAZAPI Webhook] Erro:', error)
    return res.status(400).json(createErrorResponse('Nao foi possivel configurar a recepcao de mensagens', 400))
  }
})

router.post('/disconnect', ...ownerOnly, async (req, res) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Clinica nao encontrada', 404))
    return res.json(createSuccessResponse(await disconnectUazapi(companyId)))
  } catch (error: any) {
    console.error('[UAZAPI Disconnect] Erro:', error)
    return res.status(500).json(createErrorResponse('Nao foi possivel desconectar o WhatsApp', 500))
  }
})
