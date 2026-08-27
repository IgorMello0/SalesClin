import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const activities = await prisma.leadActivity.findMany({
    where: {
      type: 'system',
      content: { contains: "Status alterado" }
    },
    include: { lead: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  console.log("Recent status changes:");
  for (const act of activities) {
    if (act.content.includes("Proposta") || act.content.includes("comercial_proposal")) {
       console.log(`[${act.createdAt.toISOString()}] Lead ${act.lead.id} (${act.lead.name}): ${act.content} (by ${act.createdBy})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
