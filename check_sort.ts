import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: { status: 'prospect_lead', companyId: 16, sdrId: 17 }, // 16 = Paraopeba, 17 = Bruna
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, updatedAt: true }
  });

  console.log(`Total Leads: ${leads.length}`);
  if (leads.length > 0) {
    console.log("Top 3 (Newest):");
    leads.slice(0, 3).forEach(l => console.log(`${l.id} - ${l.name} - ${l.updatedAt.toISOString()}`));
    
    console.log("Bottom 10 (Oldest):");
    leads.slice(-10).forEach(l => console.log(`${l.id} - ${l.name} - ${l.updatedAt.toISOString()}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
