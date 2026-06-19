import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createErrorResponse } from '../utils/response.js'
import { prisma } from '../prisma.js'

export type AuthUser = {
  id: number
  role?: string | null
  companyId?: number | null
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

      // Admin tem acesso a tudo
      if (req.user.role === 'admin') {
        return next()
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
        // Buscar o usuário com seu cargo e as permissões do cargo para este módulo
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

        // Se o usuário tem um cargo definido
        if (userWithRole.role) {
          const rolePermission = userWithRole.role.permissions[0]
          // Se houver uma restrição explícita no cargo, bloqueia
          if (rolePermission && !rolePermission.hasAccess) {
            return res.status(403).json(createErrorResponse('Acesso negado a este módulo pelo seu cargo', 403))
          }
        }

        // Além do cargo, mantemos a verificação de permissão individual como override (opcional)
        const individualPermission = await prisma.userPermission.findUnique({
          where: {
            userId_moduleId: {
              userId: req.user.id,
              moduleId: module.id,
            },
          },
        })

        if (individualPermission && !individualPermission.hasAccess) {
          return res.status(403).json(createErrorResponse('Acesso negado a este módulo (bloqueio individual)', 403))
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


