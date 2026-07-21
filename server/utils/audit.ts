import { prisma } from '../prisma.js'
import type { AuthUser } from '../middleware/auth.js'

type AuditActor = number | Pick<AuthUser, 'id' | 'type' | 'companyId'>

async function resolveProfessionalId(actor: AuditActor): Promise<number | null> {
  if (typeof actor === 'number') {
    const professional = await prisma.professional.findUnique({
      where: { id: actor },
      select: { id: true },
    })
    return professional?.id || null
  }

  if (actor.type === 'profissional') {
    return actor.id
  }

  if (actor.type === 'usuario' && actor.companyId) {
    const company = await prisma.empresa.findUnique({
      where: { id: actor.companyId },
      select: { ownerId: true },
    })
    return company?.ownerId || null
  }

  return null
}

/**
 * Registra uma acao no log de auditoria sem interromper a operacao principal.
 * O schema legado relaciona o log a Professional. Acoes de usuarios da equipe
 * sao associadas ao profissional dono da clinica ativa.
 */
export async function logAudit(
  actor: AuditActor,
  action: string,
  targetTable: string,
  targetId?: number
) {
  try {
    const professionalId = await resolveProfessionalId(actor)
    if (!professionalId) {
      console.warn(`[Audit] Registro ignorado: autor sem profissional vinculado (${action} em ${targetTable})`)
      return
    }

    await prisma.auditLog.create({
      data: {
        userId: professionalId,
        action,
        targetTable,
        targetId,
        timestamp: new Date(),
      },
    })
    console.log(`[Audit] Profissional ${professionalId} executou ${action} em ${targetTable} ${targetId ? `(ID: ${targetId})` : ''}`)
  } catch (error) {
    console.error('[Audit] Erro ao registrar log de auditoria:', error)
  }
}
