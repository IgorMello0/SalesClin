import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      closedAt: { not: null },
      status: { notIn: ['comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'] }
    },
    select: { id: true, name: true, status: true, closedAt: true, updatedAt: true }
  });

  console.log(`Found ${leads.length} leads that have closedAt set but are no longer in a closed stage.`);
  for (const lead of leads) {
    console.log(`Lead ${lead.id}: ${lead.name} | Current Status: ${lead.status} | Closed At: ${lead.closedAt} | Updated At: ${lead.updatedAt}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
