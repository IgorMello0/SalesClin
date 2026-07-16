import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({ where: { companyId: 16, OR: [{name: {contains: 'Maurília', mode: 'insensitive'}}] } });
  console.log(leads.length);
}

main().finally(() => prisma.$disconnect());
