import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { name: { contains: "Priscila de Castro Souza Ribeiro" } },
    include: {
      activities: { orderBy: { createdAt: 'asc' } },
      proposals: { orderBy: { createdAt: 'asc' } }
    }
  });
  
  if (lead) {
    console.log(`======================================`);
    console.log(`Lead: ${lead.name} (ID: ${lead.id})`);
    console.log(`Status atual: ${lead.status}`);
    console.log(`Closed At: ${lead.closedAt}`);
    console.log(`Updated At: ${lead.updatedAt}`);
    
    console.log(`\n--- PROPOSALS ---`);
    for (const prop of lead.proposals) {
      console.log(`[${prop.createdAt.toISOString()}] Proposta ID: ${prop.id} | Status: ${prop.status} | Value: ${prop.value}`);
    }

    console.log(`\n--- ACTIVITIES ---`);
    for (const act of lead.activities) {
      console.log(`[${act.createdAt.toISOString()}] Tipo: ${act.type} | User: ${act.createdBy} | Content: ${act.content}`);
    }
  } else {
    console.log("Lead not found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
