import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const compIds = [3, 16, 17]; // Luiz Carlos's clinics

  for (const compId of compIds) {
    const comp = await prisma.empresa.findUnique({ where: { id: compId }});
    console.log(`\n=== CLINIC: ${comp?.name} (ID ${compId}) ===`);

    const totalLeads = await prisma.lead.count({ where: { companyId: compId } });
    
    const semSdr = await prisma.lead.count({ where: { companyId: compId, sdrId: null } });
    const semCloser = await prisma.lead.count({ where: { companyId: compId, closerId: null } });
    const semEspecialista = await prisma.lead.count({ where: { companyId: compId, especialistaId: null } });

    console.log(`Total de Leads: ${totalLeads}`);
    console.log(`Leads SEM SDR: ${semSdr}`);
    console.log(`Leads SEM Closer: ${semCloser}`);
    console.log(`Leads SEM Especialista: ${semEspecialista}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
