import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { name: { contains: "Tiago Vaz da Silva" } },
    include: {
      activities: { orderBy: { createdAt: 'asc' } },
      proposals: { orderBy: { createdAt: 'asc' } }
    }
  });
  
  if (lead) {
    console.log(`Lead: ${lead.name}`);
    console.log(`Activities:`);
    for (const act of lead.activities) {
      console.log(`[${act.createdAt.toISOString()}] ${act.type} - ${act.content}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
