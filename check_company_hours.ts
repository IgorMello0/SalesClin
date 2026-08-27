import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findUnique({
    where: { id: 3 },
    select: { id: true, name: true, openHour: true, closeHour: true }
  });
  console.log(company);
}

main().catch(console.error).finally(() => prisma.$disconnect());
