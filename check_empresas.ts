import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.empresa.findMany({
    select: { id: true, name: true, openHour: true, closeHour: true }
  });
  console.log(companies);
}

main().catch(console.error).finally(() => prisma.$disconnect());
