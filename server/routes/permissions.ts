import { Router } from 'express'
import { prisma } from '../prisma'
import { auth } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse } from '../utils/response'
import { logAudit } from '../utils/audit'

export const router = Router()

// ==================== PERMISSÕES DE PROFISSIONAIS ====================

// Obter permissões de um profissional
router.get('/professional/:id', auth(), async (req, res) => {
  try {
    const professionalId = Number(req.params.id)
    
    // Verificar se é admin (usuário ou profissional) ou o próprio profissional
    const isAdmin = req.user?.role === 'admin';
    const isProfessionalAdmin = req.user?.type === 'profissional' && req.user?.role === 'admin';
    const isOwnProfile = req.user?.type === 'profissional' && req.user?.id === professionalId;
    
    if (!isAdmin && !isProfessionalAdmin && !isOwnProfile) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

    // Buscar todas as permissões do profissional
    const permissions = await prisma.professionalPermission.findMany({
      where: { professionalId },
      include: { module: true },
    })

    // Buscar todos os módulos para mostrar os que não têm permissão definida
    const allModules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })

    // Mapear permissões
    const permissionsMap = allModules.map((module) => {
      const permission = permissions.find((p) => p.moduleId === module.id)
      return {
        moduleId: module.id,
        moduleCode: module.code,
        moduleName: module.name,
        moduleIcon: module.icon,
        hasAccess: permission?.hasAccess ?? true, // Por padrão, tem acesso
      }
    })

    res.json(createSuccessResponse(permissionsMap))
  } catch (error: any) {
    console.error('[Permissions] Erro ao buscar permissões do profissional:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar permissões', 500))
  }
})

// Atualizar permissões de um profissional (apenas admin)
router.put('/professional/:id', auth(), async (req, res) => {
  try {
    // Apenas admin (usuário ou profissional) pode modificar permissões de profissionais
    const isAdmin = req.user?.role === 'admin';
    const isProfessionalAdmin = req.user?.type === 'profissional' && req.user?.role === 'admin';
    
    if (!isAdmin && !isProfessionalAdmin) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

    const professionalId = Number(req.params.id)
    const { permissions } = req.body as { permissions: Array<{ moduleId: number; hasAccess: boolean }> }

    if (!Array.isArray(permissions)) {
      return res.status(400).json(createErrorResponse('Formato de permissões inválido', 400))
    }

    // Verificar se o profissional existe
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
    })

    if (!professional) {
      return res.status(404).json(createErrorResponse('Profissional não encontrado', 404))
    }

    // Atualizar ou criar permissões
    const results = []
    for (const perm of permissions) {
      const result = await prisma.professionalPermission.upsert({
        where: {
          professionalId_moduleId: {
            professionalId,
            moduleId: perm.moduleId,
          },
        },
        update: {
          hasAccess: perm.hasAccess,
        },
        create: {
          professionalId,
          moduleId: perm.moduleId,
          hasAccess: perm.hasAccess,
        },
        include: { module: true },
      })
      results.push(result)
    }
    
    if (req.user?.type === 'profissional') {
      logAudit(req.user.id, 'ATUALIZAR_PERMISSOES_PROFISSIONAL', 'ProfessionalPermission', professionalId)
    }

    res.json(createSuccessResponse(results))
  } catch (error: any) {
    console.error('[Permissions] Erro ao atualizar permissões do profissional:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar permissões', 500))
  }
})

// ==================== PERMISSÕES DE USUÁRIOS ====================

// Obter permissões de um usuário
router.get('/user/:id', auth(), async (req, res) => {
  try {
    const userId = Number(req.params.id)
    
    // Buscar o usuário para validação
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { company: true },
    })

    if (!user) {
      return res.status(404).json(createErrorResponse('Usuário não encontrado', 404))
    }

    // Verificar se é profissional da mesma empresa ou admin (usuário/profissional) ou o próprio usuário
    const isProfessional = req.user?.type === 'profissional'
    const isOwnUser = req.user?.type === 'usuario' && req.user?.id === userId
    const isAdmin = req.user?.role === 'admin'

    if (isProfessional && !isAdmin) {
      const professional = await prisma.professional.findUnique({
        where: { id: req.user.id },
      })
      if (professional?.companyId !== user.companyId) {
        return res.status(403).json(createErrorResponse('Acesso negado', 403))
      }
    } else if (!isAdmin && !isOwnUser && !isProfessional) {
      return res.status(403).json(createErrorResponse('Acesso negado', 403))
    }

    // Buscar permissões do usuário
    const permissions = await prisma.userPermission.findMany({
      where: { userId },
      include: { module: true },
    })

    // Se for profissional, buscar suas próprias permissões para filtrar
    let professionalPermissions: any[] = []
    if (isProfessional) {
      professionalPermissions = await prisma.professionalPermission.findMany({
        where: { professionalId: req.user.id },
        include: { module: true },
      })
    }

    // Buscar todos os módulos
    const allModules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })

    // Mapear permissões (usuário só pode ter acesso aos módulos que o profissional tem)
    const permissionsMap = allModules.map((module) => {
      const userPermission = permissions.find((p) => p.moduleId === module.id)
      
      // Se for profissional, verificar se ele tem acesso ao módulo
      if (isProfessional) {
        const profPermission = professionalPermissions.find((p) => p.moduleId === module.id)
        const professionalHasAccess = profPermission?.hasAccess ?? true
        
        return {
          moduleId: module.id,
          moduleCode: module.code,
          moduleName: module.name,
          moduleIcon: module.icon,
          hasAccess: userPermission?.hasAccess ?? false,
          canEdit: professionalHasAccess, // Só pode editar se o profissional tem acesso
        }
      }

      return {
        moduleId: module.id,
        moduleCode: module.code,
        moduleName: module.name,
        moduleIcon: module.icon,
        hasAccess: userPermission?.hasAccess ?? false,
        canEdit: true,
      }
    })

    res.json(createSuccessResponse(permissionsMap))
  } catch (error: any) {
    console.error('[Permissions] Erro ao buscar permissões do usuário:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar permissões', 500))
  }
})

// Atualizar permissões de um usuário (profissional da mesma empresa)
router.put('/user/:id', auth(), async (req, res) => {
  try {
    const userId = Number(req.params.id)
    const { permissions } = req.body as { permissions: Array<{ moduleId: number; hasAccess: boolean }> }

    if (!Array.isArray(permissions)) {
      return res.status(400).json(createErrorResponse('Formato de permissões inválido', 400))
    }

    // Buscar o usuário
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json(createErrorResponse('Usuário não encontrado', 404))
    }

    // Verificar se é admin (usuário) ou profissional da mesma empresa
    const isUserAdmin = req.user?.type === 'usuario' && req.user?.role === 'admin';
    const isProfessional = req.user?.type === 'profissional';

    if (!isUserAdmin && !isProfessional) {
      return res.status(403).json(createErrorResponse('Apenas profissionais e admins podem gerenciar permissões de usuários', 403))
    }

    // Se for admin (usuário), verificar se é da mesma empresa
    if (isUserAdmin && req.user.companyId !== user.companyId) {
      return res.status(403).json(createErrorResponse('Você não pode gerenciar usuários de outra empresa', 403))
    }

    // Se for profissional (não admin), verificar empresa
    if (isProfessional && req.user?.role !== 'admin') {
      const professional = await prisma.professional.findUnique({
        where: { id: req.user.id },
      })

      if (professional?.companyId !== user.companyId) {
        return res.status(403).json(createErrorResponse('Você não pode gerenciar usuários de outra empresa', 403))
      }
    }

    // Se não for admin, buscar permissões do profissional para validar
    if (!isUserAdmin && isProfessional) {
      const professionalPermissions = await prisma.professionalPermission.findMany({
        where: { professionalId: req.user.id },
      })

      // Validar que o profissional não está dando permissões que ele não tem
      for (const perm of permissions) {
        if (perm.hasAccess) {
          const profPerm = professionalPermissions.find((p) => p.moduleId === perm.moduleId)
          const professionalHasAccess = profPerm?.hasAccess ?? true
          
          if (!professionalHasAccess) {
            const module = await prisma.module.findUnique({ where: { id: perm.moduleId } })
            return res.status(403).json(
              createErrorResponse(
                `Você não pode dar acesso ao módulo "${module?.name}" pois você não tem acesso a ele`,
                403
              )
            )
          }
        }
      }
    }

    // Atualizar ou criar permissões
    const results = []
    for (const perm of permissions) {
      const result = await prisma.userPermission.upsert({
        where: {
          userId_moduleId: {
            userId,
            moduleId: perm.moduleId,
          },
        },
        update: {
          hasAccess: perm.hasAccess,
        },
        create: {
          userId,
          moduleId: perm.moduleId,
          hasAccess: perm.hasAccess,
        },
        include: { module: true },
      })
      results.push(result)
    }
    
    if (req.user?.type === 'profissional') {
      logAudit(req.user.id, 'ATUALIZAR_PERMISSOES_USUARIO', 'UserPermission', userId)
    }

    res.json(createSuccessResponse(results))
  } catch (error: any) {
    console.error('[Permissions] Erro ao atualizar permissões do usuário:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar permissões', 500))
  }
})

// ==================== MINHAS PERMISSÕES ====================

  // Obter permissões do usuário logado
router.get('/my-permissions', auth(), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(createErrorResponse('Não autenticado', 401))
    }

    // Admin (usuário ou profissional) tem acesso a tudo
    if (req.user.role === 'admin') {
      const allModules = await prisma.module.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      })
      
      const permissions = allModules.map((module) => ({
        moduleCode: module.code,
        moduleName: module.name,
        hasAccess: true,
      }))
      
      return res.json(createSuccessResponse(permissions))
    }

    // Buscar permissões baseado no tipo de usuário
    let permissions: any[] = []
    
    if (req.user.type === 'profissional') {
      // Buscar permissões do profissional
      const profPermissions = await prisma.professionalPermission.findMany({
        where: { professionalId: req.user.id },
        include: { module: true },
      })
      
      const allModules = await prisma.module.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      })
      
      permissions = allModules.map((module) => {
        const perm = profPermissions.find((p) => p.moduleId === module.id)
        return {
          moduleCode: module.code,
          moduleName: module.name,
          hasAccess: perm?.hasAccess ?? true, // Por padrão, profissional tem acesso
        }
      })
    } else if (req.user.type === 'usuario') {
      // Buscar permissões do usuário
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: req.user.id },
        include: { module: true },
      })
      
      permissions = userPermissions
        .filter((p) => p.hasAccess)
        .map((p) => ({
          moduleCode: p.module.code,
          moduleName: p.module.name,
          hasAccess: true,
        }))
    }

    res.json(createSuccessResponse(permissions))
  } catch (error: any) {
    console.error('[Permissions] Erro ao buscar permissões do usuário logado:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar permissões', 500))
  }
})

