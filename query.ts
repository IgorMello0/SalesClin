import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.lead.update({ where: { id: 338 }, data: { name: 'Maurília' } });
  console.log('Atualizado');
}

main().finally(() => prisma.$disconnect());
