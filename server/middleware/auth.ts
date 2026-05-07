import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createErrorResponse } from '../utils/response.js'

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
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.substring(7) : undefined

    if (!token) {
      if (required) return res.status(401).json(createErrorResponse('Não autenticado', 401))
      return next()
    }

    try {
      const secret = process.env.JWT_SECRET || 'dev-secret'
      const payload = jwt.verify(token, secret) as AuthUser
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
        // Buscar permissão do usuário
        const permission = await prisma.userPermission.findUnique({
          where: {
            userId_moduleId: {
              userId: req.user.id,
              moduleId: module.id,
            },
          },
        })

        // Se não há permissão definida, por padrão tem acesso (liberando módulos)
        if (permission && !permission.hasAccess) {
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


