import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leadNames = [
    "Pétala Sabrina",
    "Tiago Vaz da Silva",
    "Vanderlei Jose",
    "Márcia Regina",
    "Alexandra DE Castro"
  ];
  
  for (const name of leadNames) {
    const lead = await prisma.lead.findFirst({
      where: { name: { contains: name } },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' }
        },
        proposals: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (lead) {
      console.log(`\n======================================`);
      console.log(`Lead: ${lead.name} (ID: ${lead.id})`);
      console.log(`Status atual: ${lead.status}`);
      console.log(`Closed At: ${lead.closedAt}`);
      console.log(`Updated At: ${lead.updatedAt}`);
      console.log(`Is Paid: ${lead.isPaid}`);
      
      console.log(`\n--- ACTIVITIES ---`);
      for (const act of lead.activities) {
        console.log(`[${act.createdAt.toISOString()}] Tipo: ${act.type} | User: ${act.createdBy} | Content: ${act.content}`);
      }
      
      console.log(`\n--- PROPOSALS ---`);
      for (const prop of lead.proposals) {
        console.log(`[${prop.createdAt.toISOString()}] Proposta ID: ${prop.id} | Status: ${prop.status} | Value: ${prop.value}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
