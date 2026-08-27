import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const activities = await prisma.leadActivity.findMany({
    where: {
      type: 'system',
      content: { contains: "Status alterado" }
    },
    include: { lead: { select: { id: true, name: true, status: true } } }
  });

  const reverted = activities.filter(a => a.content.includes("de Fechado") && !a.content.includes("para Fechado"));
  
  console.log(`Found ${reverted.length} activities reverting FROM Fechado to any other stage in the entire history.`);
  for (const act of reverted) {
    console.log(`[${act.createdAt.toISOString()}] Lead ${act.lead.name}: ${act.content} (by ${act.createdBy})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
