import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createErrorResponse } from '../utils/response.js'
import { prisma } from '../prisma.js'
import { canCompanyAccessModule } from '../services/billing.js'

export type AuthUser = {
  id: number
  role?: string | null
  companyId?: number | null
  allowedCompanies?: number[]
  type: 'usuario' | 'profissional' | 'cliente'
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

export function auth(required = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.substring(7) : undefined

    if (!token) {
      if (required) return res.status(401).json(createErrorResponse('Não autenticado', 401))
      return next()
    }

    try {
      const secret = process.env.JWT_SECRET || 'dev-secret'
      const payload = jwt.verify(token, secret) as AuthUser & { allowedCompanies?: number[] }

      if (!payload.companyId || !payload.allowedCompanies?.length) {
        if (payload.type === 'profissional') {
          const professional = await prisma.professional.findUnique({
            where: { id: payload.id },
            select: {
              companyId: true,
              ownedCompanies: { select: { id: true } },
            },
          })

          const allowedCompanies = [
            ...(professional?.companyId ? [professional.companyId] : []),
            ...(professional?.ownedCompanies.map(company => company.id) || []),
          ]

          payload.allowedCompanies = Array.from(new Set([
            ...(payload.allowedCompanies || []),
            ...allowedCompanies,
          ]))
          payload.companyId = payload.companyId || professional?.companyId || payload.allowedCompanies[0] || null
        } else if (payload.type === 'usuario') {
          const user = await prisma.usuario.findUnique({
            where: { id: payload.id },
            select: {
              companyId: true,
              companyAccess: {
                where: { isActive: true },
                select: { companyId: true },
              },
            },
          })

          const allowedCompanies = [
            ...(user?.companyId ? [user.companyId] : []),
            ...(user?.companyAccess.map(access => access.companyId) || []),
          ]

          payload.allowedCompanies = Array.from(new Set([
            ...(payload.allowedCompanies || []),
            ...allowedCompanies,
          ]))
          payload.companyId = payload.companyId || user?.companyId || payload.allowedCompanies[0] || null
        }
      }
      
      // Se o frontend solicitar troca de contexto (clínica)
      const targetCompanyId = req.headers['x-company-id']
      if (targetCompanyId) {
        const id = Number(targetCompanyId)
        // Verifica se o usuário tem permissão para acessar esta clínica
        if (payload.allowedCompanies && payload.allowedCompanies.includes(id)) {
          payload.companyId = id
        } else if ((payload.type as string) !== 'admin') {
          // Bloqueia a troca se a clínica não estiver na lista (a menos que seja super admin)
          return res.status(403).json(createErrorResponse('Acesso negado a esta clínica', 403))
        } else {
          payload.companyId = id
        }
      }
      
      req.user = payload
      return next()
    } catch {
      return res.status(401).json(createErrorResponse('Token inválido', 401))
    }
  }
}

export function requireCompany(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.companyId) return res.status(400).json(createErrorResponse('Empresa não definida', 400))
  return next()
}

export function requireRoles(roles: Array<string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json(createErrorResponse('Sem permissão', 403))
    }
    return next()
  }
}

export function requireModule(moduleCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json(createErrorResponse('Não autenticado', 401))
      }

      // Importar prisma aqui para evitar circular dependency
      const { prisma } = await import('../prisma.js')

      // Buscar o módulo pelo código
      const module = await prisma.module.findUnique({
        where: { code: moduleCode },
      })

      if (!module) {
        console.warn(`[Auth] Módulo "${moduleCode}" não encontrado no banco. Liberando acesso por padrão.`)
        return next()
      }

      const planAccess = await canCompanyAccessModule(req.user.companyId, moduleCode)
      if (!planAccess.hasAccess) {
        return res.status(403).json(
          createErrorResponse('Este modulo nao esta incluido no plano da clinica', 403)
        )
      }

      // Admin tem acesso a todos os modulos liberados pelo plano
      if (req.user.role === 'admin') {
        return next()
      }

      // Verificar permissão baseado no tipo de usuário
      if (req.user.type === 'profissional') {
        // Buscar permissão do profissional
        const permission = await prisma.professionalPermission.findUnique({
          where: {
            professionalId_moduleId: {
              professionalId: req.user.id,
              moduleId: module.id,
            },
          },
        })

        // Se não há permissão definida, por padrão tem acesso
        // Se há permissão, verificar se hasAccess é true
        if (permission && !permission.hasAccess) {
          return res.status(403).json(createErrorResponse('Acesso negado a este módulo', 403))
        }

        return next()
      } else if (req.user.type === 'usuario') {
        // Buscar o acesso do usuário à clínica ativa com o respectivo cargo e permissões
        const companyAccess = await prisma.userCompanyAccess.findUnique({
          where: {
            userId_companyId: {
              userId: req.user.id,
              companyId: req.user.companyId || 0,
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  where: { moduleId: module.id },
                },
              },
            },
          },
        })

        // Buscar o usuário global para fallback do cargo
        const userWithRole = await prisma.usuario.findUnique({
          where: { id: req.user.id },
          include: {
            role: {
              include: {
                permissions: {
                  where: { moduleId: module.id }
                }
              }
            }
          }
        })

        if (!userWithRole) {
          return res.status(403).json(createErrorResponse('Usuário não encontrado', 403))
        }

        const activeRole = companyAccess?.role || userWithRole.role
        const rolePermission = activeRole?.permissions[0]

        // Buscar permissão individual (override)
        const individualPermission = await prisma.userPermission.findUnique({
          where: {
            userId_moduleId: {
              userId: req.user.id,
              moduleId: module.id,
            },
          },
        })

        // Segue a mesma hierarquia de prioridade do frontend/permissions API:
        // 1. Permissão Individual (se existir)
        // 2. Permissão do Cargo (se existir)
        // 3. Padrão: Permitido (true)
        const hasAccess = individualPermission?.hasAccess ?? rolePermission?.hasAccess ?? true

        if (!hasAccess) {
          return res.status(403).json(createErrorResponse('Acesso negado a este módulo', 403))
        }

        return next()
      }

      // Tipo de usuário desconhecido
      return res.status(403).json(createErrorResponse('Tipo de usuário inválido', 403))
    } catch (error) {
      console.error('[Auth] Erro ao verificar permissão de módulo:', error)
      return res.status(500).json(createErrorResponse('Erro ao verificar permissão', 500))
    }
  }
}

export function requirePermission(moduleCode: string, permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json(createErrorResponse('Não autenticado', 401))
      }

      // Importar prisma aqui para evitar circular dependency
      const { prisma } = await import('../prisma.js')

      // Buscar o módulo pelo código
      const module = await prisma.module.findUnique({
        where: { code: moduleCode },
      })

      if (!module) {
        console.warn(`[Auth] Módulo "${moduleCode}" não encontrado no banco. Liberando acesso por padrão.`)
        return next()
      }

      const planAccess = await canCompanyAccessModule(req.user.companyId, moduleCode)
      if (!planAccess.hasAccess) {
        return res.status(403).json(
          createErrorResponse('Este modulo nao esta incluido no plano da clinica', 403)
        )
      }

      // Admin tem acesso a tudo
      if (req.user.role === 'admin') {
        return next()
      }

      // Profissional tem acesso a tudo por padrão
      if (req.user.type === 'profissional') {
        const permission = await prisma.professionalPermission.findUnique({
          where: {
            professionalId_moduleId: {
              professionalId: req.user.id,
              moduleId: module.id,
            },
          },
        })

        if (permission && !permission.hasAccess) {
          return res.status(403).json(createErrorResponse('Acesso negado a este módulo', 403))
        }

        const subPerms = permission?.subPermissions as Record<string, boolean> | null
        const hasSubAccess = subPerms && subPerms[permissionKey] !== undefined ? subPerms[permissionKey] : true

        if (!hasSubAccess) {
          return res.status(403).json(createErrorResponse('Acesso negado a esta funcionalidade', 403))
        }

        return next()
      } else if (req.user.type === 'usuario') {
        // Buscar o acesso do usuário à clínica ativa com o respectivo cargo e permissões
        const companyAccess = await prisma.userCompanyAccess.findUnique({
          where: {
            userId_companyId: {
              userId: req.user.id,
              companyId: req.user.companyId || 0,
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  where: { moduleId: module.id },
                },
              },
            },
          },
        })

        // Buscar o usuário global para fallback do cargo
        const userWithRole = await prisma.usuario.findUnique({
          where: { id: req.user.id },
          include: {
            role: {
              include: {
                permissions: {
                  where: { moduleId: module.id }
                }
              }
            }
          }
        })

        if (!userWithRole) {
          return res.status(403).json(createErrorResponse('Usuário não encontrado', 403))
        }

        const activeRole = companyAccess?.role || userWithRole.role
        const rolePermission = activeRole?.permissions[0]

        // Buscar permissão individual (override)
        const individualPermission = await prisma.userPermission.findUnique({
          where: {
            userId_moduleId: {
              userId: req.user.id,
              moduleId: module.id,
            },
          },
        })

        const hasAccess = individualPermission?.hasAccess ?? rolePermission?.hasAccess ?? true

        if (!hasAccess) {
          return res.status(403).json(createErrorResponse('Acesso negado a este módulo', 403))
        }

        // Se tem acesso ao módulo principal, verifica a sub-permissão granular
        const subPerms = rolePermission?.subPermissions as Record<string, boolean> | null
        const hasSubAccess = subPerms && subPerms[permissionKey] !== undefined ? subPerms[permissionKey] : true

        if (!hasSubAccess) {
          return res.status(403).json(createErrorResponse('Acesso negado a esta funcionalidade', 403))
        }

        return next()
      }

      return res.status(403).json(createErrorResponse('Tipo de usuário inválido', 403))
    } catch (error) {
      console.error('[Auth] Erro ao verificar sub-permissão:', error)
      return res.status(500).json(createErrorResponse('Erro ao verificar permissão', 500))
    }
  }
}


