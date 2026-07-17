import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { prisma } from '../prisma.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import { listWhatsAppTemplates, syncMetaTemplates } from '../services/whatsapp-templates.js'

export const router = Router()

async function getRequestCompanyId(req: any) {
  if (req.user?.companyId) return Number(req.user.companyId)
  if (req.user?.type === 'profissional') {
    const professional = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { companyId: true },
    })
    return professional?.companyId || null
  }
  return null
}

router.get('/', auth(), async (req, res) => {
  try {
    const companyId = await getRequestCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Empresa nao encontrada', 404))

    const templates = await listWhatsAppTemplates(companyId, String(req.query.status || ''))
    return res.json(createSuccessResponse(templates))
  } catch (error: any) {
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao listar templates', 500))
  }
})

router.post('/sync', auth(), async (req, res) => {
  try {
    const companyId = await getRequestCompanyId(req)
    if (!companyId) return res.status(404).json(createErrorResponse('Empresa nao encontrada', 404))

    const templates = await syncMetaTemplates(companyId)
    return res.json(createSuccessResponse(templates))
  } catch (error: any) {
    console.error('[WhatsApp Templates] Erro ao sincronizar:', error)
    return res.status(400).json(createErrorResponse(error.message || 'Erro ao sincronizar templates', 400))
  }
})
