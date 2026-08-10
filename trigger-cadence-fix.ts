import { PrismaClient } from '@prisma/client'
import { triggerCadenceForLead } from './server/services/cadence.js'

const prisma = new PrismaClient()

async function main() {
  console.log('Buscando leads sem tarefas de cadência...')
  
  // Buscar leads recentes (últimos 7 dias) que estão em etapas com cadência ativa
  const leads = await prisma.lead.findMany({
    include: { tasks: { where: { status: 'pending', cadenceStageCode: { not: null } } } }
  });

  let triggered = 0;
  for (const lead of leads) {
    if (lead.tasks.length === 0) {
      // Tentar engatilhar (se não houver config, a função ignora silenciosamente)
      await triggerCadenceForLead(lead.id, lead.companyId!, lead.status, lead.sdrId || lead.closerId, lead.professionalId);
      triggered++;
    }
  }

  console.log(`Verificados ${leads.length} leads. Cadência ativada retroativamente para ${triggered} leads.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
