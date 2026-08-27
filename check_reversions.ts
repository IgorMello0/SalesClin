import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activities = await prisma.leadActivity.findMany({
    where: {
      type: 'system',
      createdAt: { gte: today },
      content: { contains: "Status alterado de " }
    },
    include: { lead: { select: { name: true, status: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const reverted = activities.filter(a => a.content.includes("Fechado") && a.content.includes("Proposta"));
  
  console.log(`Found ${reverted.length} activities reverting from Fechado to Proposta today.`);
  for (const act of reverted.slice(0, 10)) {
    console.log(`[${act.createdAt.toISOString()}] Lead: ${act.lead.name} - Activity: ${act.content} (by ${act.createdBy})`);
  }

  if (reverted.length === 0) {
    console.log("No reversions found today. Let's check the last 7 days.");
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const activitiesWeek = await prisma.leadActivity.findMany({
      where: {
        type: 'system',
        createdAt: { gte: lastWeek },
        content: { contains: "Status alterado de" }
      },
      include: { lead: { select: { name: true, status: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const revertedWeek = activitiesWeek.filter(a => a.content.includes("Fechado") && a.content.includes("Proposta"));
    console.log(`Found ${revertedWeek.length} activities reverting from Fechado to Proposta in the last 7 days.`);
    for (const act of revertedWeek.slice(0, 10)) {
      console.log(`[${act.createdAt.toISOString()}] Lead: ${act.lead.name} - Activity: ${act.content} (by ${act.createdBy})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
