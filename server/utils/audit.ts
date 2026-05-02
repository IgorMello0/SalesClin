import { prisma } from '../prisma'

/**
 * Registra uma ação no log de auditoria
 * 
 * @param userId ID do profissional que realizou a ação
 * @param action Descrição da ação (ex: 'CRIAR', 'ATUALIZAR', 'DELETAR')
 * @param targetTable Nome da tabela afetada (ex: 'Appointment', 'Client')
 * @param targetId ID do registro afetado (opcional)
 */
export async function logAudit(
  userId: number,
  action: string,
  targetTable: string,
  targetId?: number
) {
  try {
    // Verificação de segurança: não falhar a requisição principal se o log falhar
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetTable,
        targetId,
        timestamp: new Date()
      }
    })
    console.log(`[Audit] Usuário ${userId} executou ${action} em ${targetTable} ${targetId ? `(ID: ${targetId})` : ''}`)
  } catch (error) {
    console.error('[Audit] Erro ao registrar log de auditoria:', error)
  }
}
