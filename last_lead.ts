import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const status = 'prospect_lead';
  
  // Group by company
  const companies = await prisma.empresa.findMany();
  for (const comp of companies) {
    const total = await prisma.lead.count({ where: { status, companyId: comp.id } });
    console.log(`Empresa: ${comp.name} - Leads Novos: ${total}`);
    
    if (total > 0) {
      const leads = await prisma.lead.findMany({
        where: { status, companyId: comp.id },
        orderBy: [{ contactCount: 'asc' }, { updatedAt: 'desc' }], // Check both possible orderings just in case
        select: { id: true, name: true, sdr: { select: { name: true } } }
      });
      console.log(`  -> Último Lead (Default order): [ID: ${leads[leads.length-1].id}] ${leads[leads.length-1].name} (SDR: ${leads[leads.length-1].sdr?.name})`);
    }
  }

  // Group by SDR
  const sdrs = await prisma.usuario.findMany({ where: { role: { isSDR: true } } });
  for (const sdr of sdrs) {
    const total = await prisma.lead.count({ where: { status, sdrId: sdr.id } });
    if (total > 0) {
      console.log(`SDR: ${sdr.name} - Leads Novos: ${total}`);
      const leads = await prisma.lead.findMany({
        where: { status, sdrId: sdr.id },
        orderBy: [{ contactCount: 'asc' }, { updatedAt: 'desc' }],
        select: { id: true, name: true }
      });
      console.log(`  -> Último Lead (Default order): [ID: ${leads[leads.length-1].id}] ${leads[leads.length-1].name}`);
    }
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
