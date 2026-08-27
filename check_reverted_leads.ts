import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find leads that have closedAt set but are currently in 'comercial_proposal'
  const leads = await prisma.lead.findMany({
    where: {
      closedAt: { not: null },
      status: 'comercial_proposal'
    },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    },
    take: 5
  });

  console.log(`Found ${leads.length} leads with closedAt set but currently in comercial_proposal`);
  
  for (const lead of leads) {
    console.log(`\nLead ID: ${lead.id} - Name: ${lead.name}`);
    console.log(`Status: ${lead.status}`);
    console.log(`Closed At: ${lead.closedAt}`);
    console.log(`Updated At: ${lead.updatedAt}`);
    
    console.log("Recent Activities:");
    for (const act of lead.activities) {
      console.log(`  [${act.createdAt.toISOString()}] ${act.type} - ${act.content} (by ${act.createdBy})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
