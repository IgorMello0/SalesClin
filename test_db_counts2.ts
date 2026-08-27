import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const c3_start = new Date('2026-08-24T00:00:00-03:00');
  const c3_end = new Date('2026-08-25T23:59:59-03:00');
  const count3 = await prisma.lead.count({ where: { createdAt: { gte: c3_start, lte: c3_end } }});
  console.log(`August 24 and 25: ${count3}`);

  const c4_start = new Date('2026-07-23T00:00:00-03:00');
  const c4_end = new Date('2026-08-23T23:59:59-03:00');
  const count4 = await prisma.lead.count({ where: { createdAt: { gte: c4_start, lte: c4_end } }});
  console.log(`July 23 to August 23 (The Bugged Range): ${count4}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
