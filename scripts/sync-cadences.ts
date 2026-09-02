import { PrismaClient } from '@prisma/client';
import { triggerCadenceForLead } from '../server/services/cadence.js';

const prisma = new PrismaClient();

async function syncAllCadences() {
  console.log('Iniciando sincronização de cadências...');
  
  // Buscar todas as configurações de cadência ativas
  const activeConfigs = await prisma.cadenceConfig.findMany({
    where: { isActive: true }
  });
  
  let totalUpdated = 0;

  for (const config of activeConfigs) {
    // Buscar todos os leads que estão nessa etapa para esta empresa
    const leadsInStage = await prisma.lead.findMany({
      where: { 
        companyId: config.companyId,
        status: config.stageCode
      }
    });

    if (leadsInStage.length > 0) {
      console.log(`Atualizando ${leadsInStage.length} leads na etapa ${config.stageCode} da empresa ${config.companyId}...`);
      
      for (const lead of leadsInStage) {
        try {
          await triggerCadenceForLead(
            lead.id, 
            lead.companyId!, 
            lead.status, 
            lead.sdrId || lead.closerId, 
            lead.professionalId
          );
          totalUpdated++;
        } catch (err) {
          console.error(`Erro ao sincronizar lead ${lead.id}:`, err);
        }
      }
    }
  }

  console.log(`\nSincronização concluída! Total de ${totalUpdated} leads atualizados para a cadência mais recente.`);
}

syncAllCadences().catch(console.error).finally(() => prisma.$disconnect());
