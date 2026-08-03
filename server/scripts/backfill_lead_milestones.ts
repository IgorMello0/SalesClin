import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando backfill histórico de métricas de Leads...')
  
  // Buscar funis para entender quais estágios existem
  const funnels = await prisma.funnelConfig.findMany({
    include: { stages: { orderBy: { order: 'asc' } } }
  });

  const prospectStages = funnels.find(f => f.code === 'prospecting')?.stages.map(s => s.code) || [];
  const commercialStages = funnels.find(f => f.code === 'commercial')?.stages.map(s => s.code) || [];

  const finalCommercialStages = commercialStages.length > 0 ? commercialStages : ['comercial_proposal', 'comercial_follow', 'comercial_closed'];
  const attendedStages = ['prospect_attended', ...finalCommercialStages];
  const closedStages = Array.from(new Set(['comercial_closed', 'sales_payment', 'sales_contract', 'sales_post']));

  // Todos os leads que precisam de attendedAt
  const attendedLeads = await prisma.lead.findMany({
    where: { 
      status: { in: attendedStages },
      attendedAt: null
    },
    select: { id: true, updatedAt: true, convertedAt: true }
  });
  
  console.log(`[+] Encontrados ${attendedLeads.length} leads para backfill de attendedAt`);
  for (const lead of attendedLeads) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { attendedAt: lead.convertedAt || lead.updatedAt }
    });
  }

  // Todos os leads que precisam de proposalAt
  const proposalLeads = await prisma.lead.findMany({
    where: { 
      status: { in: finalCommercialStages },
      proposalAt: null
    },
    select: { id: true, updatedAt: true, convertedAt: true }
  });
  
  console.log(`[+] Encontrados ${proposalLeads.length} leads para backfill de proposalAt`);
  for (const lead of proposalLeads) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { proposalAt: lead.convertedAt || lead.updatedAt }
    });
  }

  // Todos os leads que precisam de closedAt
  const closedLeads = await prisma.lead.findMany({
    where: { 
      status: { in: closedStages },
      closedAt: null
    },
    select: { id: true, updatedAt: true, convertedAt: true }
  });
  
  console.log(`[+] Encontrados ${closedLeads.length} leads para backfill de closedAt`);
  for (const lead of closedLeads) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { closedAt: lead.convertedAt || lead.updatedAt }
    });
  }

  console.log('Backfill concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
