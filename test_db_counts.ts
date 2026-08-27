import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const c1_start = new Date('2026-07-24T00:00:00-03:00');
  const c1_end = new Date('2026-08-25T23:59:59-03:00');
  
  const c2_start = new Date('2026-08-01T00:00:00-03:00');
  const c2_end = new Date('2026-08-25T23:59:59-03:00');

  const count1 = await prisma.lead.count({ where: { createdAt: { gte: c1_start, lte: c1_end } }});
  const count2 = await prisma.lead.count({ where: { createdAt: { gte: c2_start, lte: c2_end } }});

  console.log(`July 24 to Today: ${count1}`);
  console.log(`August 1 to Today: ${count2}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
