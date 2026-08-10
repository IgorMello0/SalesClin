import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'

const prisma = new PrismaClient()
export const router = Router()

// GET /api/cadence/:stageCode
router.get('/:stageCode', auth(), async (req, res) => {
  try {
    const { stageCode } = req.params
    const companyId = req.user?.companyId

    if (!companyId) return res.status(403).json(createErrorResponse('Acesso negado'))

    const config = await prisma.cadenceConfig.findUnique({
      where: {
        companyId_stageCode: {
          companyId,
          stageCode
        }
      }
    })

    if (!config) {
      return res.json(createSuccessResponse({
        stageCode,
        isActive: true,
        steps: []
      }))
    }

    res.json(createSuccessResponse(config))
  } catch (error: any) {
    console.error('[Cadence] Erro ao buscar configuração:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar configuração da cadência', 500))
  }
})

// PUT /api/cadence/:stageCode
router.put('/:stageCode', auth(), async (req, res) => {
  try {
    const { stageCode } = req.params
    const companyId = req.user?.companyId
    const { isActive, steps } = req.body

    if (!companyId) return res.status(403).json(createErrorResponse('Acesso negado'))
    if (req.user?.type !== 'usuario' && req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Acesso negado.'))
    }

    if (req.user?.type === 'usuario') {
      // Verificar se o usuário tem permissão de admin/gestor
      const dbUser = await prisma.usuario.findUnique({ where: { id: req.user.id }, include: { role: true } })
      if (dbUser?.role && !dbUser.role.isAdmin && !dbUser.role.isManager) {
        return res.status(403).json(createErrorResponse('Apenas Administradores ou Gestores podem configurar cadências.'))
      }
    }

    const config = await prisma.cadenceConfig.upsert({
      where: {
        companyId_stageCode: {
          companyId,
          stageCode
        }
      },
      update: {
        isActive: isActive !== undefined ? isActive : true,
        steps: steps || []
      },
      create: {
        companyId,
        stageCode,
        isActive: isActive !== undefined ? isActive : true,
        steps: steps || []
      }
    })

    res.json(createSuccessResponse(config))
  } catch (error: any) {
    console.error('[Cadence] Erro ao salvar configuração:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao salvar configuração da cadência', 500))
  }
})
