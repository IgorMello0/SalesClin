import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'

export const router = Router()

// Listar todos os módulos ativos
router.get('/', auth(), async (_req, res) => {
  try {
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })
    res.json(createSuccessResponse(modules))
  } catch (error: any) {
    console.error('[Modules] Erro ao listar módulos:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao listar módulos', 500))
  }
})

// Buscar módulo por código
router.get('/:code', auth(), async (req, res) => {
  try {
    const { code } = req.params
    const module = await prisma.module.findUnique({
      where: { code },
    })
    
    if (!module) {
      return res.status(404).json(createErrorResponse('Módulo não encontrado', 404))
    }
    
    res.json(createSuccessResponse(module))
  } catch (error: any) {
    console.error('[Modules] Erro ao buscar módulo:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar módulo', 500))
  }
})

// Criar novo módulo (apenas admin)
router.post('/', auth(), async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

    const { code, name, description, icon } = req.body
    
    if (!code || !name) {
      return res.status(400).json(createErrorResponse('Código e nome são obrigatórios', 400))
    }

    const exists = await prisma.module.findUnique({ where: { code } })
    if (exists) {
      return res.status(400).json(createErrorResponse('Módulo com este código já existe', 400))
    }

    const module = await prisma.module.create({
      data: { code, name, description, icon },
    })
    
    res.status(201).json(createSuccessResponse(module))
  } catch (error: any) {
    console.error('[Modules] Erro ao criar módulo:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar módulo', 500))
  }
})

// Atualizar módulo (apenas admin)
router.put('/:id', auth(), async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

    const id = Number(req.params.id)
    const { code, name, description, icon, isActive } = req.body
    
    const module = await prisma.module.update({
      where: { id },
      data: { code, name, description, icon, isActive },
    })
    
    res.json(createSuccessResponse(module))
  } catch (error: any) {
    console.error('[Modules] Erro ao atualizar módulo:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Módulo não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar módulo', 500))
  }
})

// Deletar módulo (apenas admin)
router.delete('/:id', auth(), async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

    const id = Number(req.params.id)
    
    await prisma.module.delete({ where: { id } })
    
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Modules] Erro ao deletar módulo:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Módulo não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao deletar módulo', 500))
  }
})

