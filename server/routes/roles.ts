import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'

export const router = Router()

// Listar cargos da empresa do usuário logado
router.get('/', auth(), async (req, res) => {
  try {
    let companyId: number | undefined

    if (req.user?.type === 'profissional') {
      const prof = await prisma.professional.findUnique({
        where: { id: req.user.id },
        select: { companyId: true }
      })
      companyId = prof?.companyId || undefined
    } else if (req.user?.type === 'usuario') {
      companyId = req.user.companyId || undefined
    }

    if (!companyId) {
      return res.status(404).json(createErrorResponse('Empresa não encontrada', 404))
    }

    const roles = await prisma.role.findMany({
      where: { companyId },
      include: {
        permissions: {
          include: { module: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    res.json(createSuccessResponse(roles))
  } catch (error: any) {
    console.error('[Roles] Erro ao listar:', error)
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})

// Buscar um cargo específico com permissões
router.get('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true
      }
    })
    
    if (!role) return res.status(404).json(createErrorResponse('Cargo não encontrado', 404))
    
    res.json(createSuccessResponse(role))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})

// Criar novo cargo
router.post('/', auth(), async (req, res) => {
  try {
    const { name, value, permissions, isSpecialist, isAdmin, isSDR, isCloser, isManager } = req.body // permissions: Array<{ moduleId: number, hasAccess: boolean }>
    let companyId: number | undefined
    let professionalId: number | undefined

    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Somente o profissional pode criar cargos', 403))
    }

    const prof = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { id: true, companyId: true }
    })
    companyId = prof?.companyId || undefined
    professionalId = prof?.id || undefined

    if (!companyId || !professionalId) {
      return res.status(404).json(createErrorResponse('Empresa ou Profissional responsável não encontrado', 404))
    }

    // Verificar se já existe
    const existing = await prisma.role.findFirst({
      where: { companyId, value }
    })

    if (existing) {
      return res.status(400).json(createErrorResponse('Este cargo já existe nesta empresa', 400))
    }

    // Criar cargo e permissões em uma transação
    const created = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          companyId,
          professionalId,
          name,
          value,
          isSpecialist: isSpecialist || false,
          isAdmin: isAdmin || false,
          isSDR: isSDR || false,
          isCloser: isCloser || false,
          isManager: isManager || false
        }
      })

      if (permissions && Array.isArray(permissions)) {
        await tx.rolePermission.createMany({
          data: permissions.map((p: any) => ({
            roleId: newRole.id,
            moduleId: p.moduleId,
            hasAccess: p.hasAccess,
            subPermissions: p.subPermissions || null
          }))
        })
      }

      return newRole
    })

    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Roles] Erro ao criar:', error)
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})

// Atualizar cargo e permissões
router.put('/:id', auth(), async (req, res) => {
  try {
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Somente o profissional pode editar cargos', 403))
    }
    const id = Number(req.params.id)
    const { name, permissions, isSpecialist, isAdmin, isSDR, isCloser, isManager } = req.body

    const updated = await prisma.$transaction(async (tx) => {
      // Atualizar nome do cargo
      const role = await tx.role.update({
        where: { id },
        data: { 
          name,
          isSpecialist: isSpecialist !== undefined ? isSpecialist : undefined,
          isAdmin: isAdmin !== undefined ? isAdmin : undefined,
          isSDR: isSDR !== undefined ? isSDR : undefined,
          isCloser: isCloser !== undefined ? isCloser : undefined,
          isManager: isManager !== undefined ? isManager : undefined
        }
      })

      // Atualizar permissões (deleta e recria para simplificar)
      if (permissions && Array.isArray(permissions)) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        })

        await tx.rolePermission.createMany({
          data: permissions.map((p: any) => ({
            roleId: id,
            moduleId: p.moduleId,
            hasAccess: p.hasAccess,
            subPermissions: p.subPermissions || null
          }))
        })
      }

      return role
    })

    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Roles] Erro ao atualizar:', error)
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})

// Deletar cargo
router.delete('/:id', auth(), async (req, res) => {
  try {
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Somente o profissional pode excluir cargos', 403))
    }
    const id = Number(req.params.id)
    
    // Verificar se há usuários vinculados
    const usersCount = await prisma.usuario.count({ where: { roleId: id } })
    if (usersCount > 0) {
      return res.status(400).json(createErrorResponse('Não é possível excluir um cargo que possui usuários vinculados', 400))
    }

    await prisma.role.delete({ where: { id } })
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Roles] Erro ao deletar:', error)
    res.status(500).json(createErrorResponse(error.message, 500))
  }
})
