const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const stats = await prisma.lead.groupBy({
    by: ['status'],
    _sum: { value: true },
    _count: { id: true }
  });
  console.log("STATS:", JSON.stringify(stats, null, 2));
  
  const payments = await prisma.payment.findMany();
  console.log("PAYMENTS:", JSON.stringify(payments, null, 2));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
