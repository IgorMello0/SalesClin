import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.empresa.findMany({
    include: {
      subscription: true,
      owner: {
        select: { id: true, name: true }
      }
    }
  });
  console.log(JSON.stringify(companies, null, 2));
}
main().finally(() => prisma.$disconnect());
