import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({ 
    where: { name: { contains: 'Francine' } }, 
    include: { proposals: true } 
  });
  console.log(JSON.stringify(leads, null, 2));
}

main().finally(() => prisma.$disconnect());
