import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const where = { professionalId: 5, companyId: 4 };
  const items = await prisma.client.findMany({
    where,
    include: {
      professional: true,
      appointments: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true
        }
      }
    }
  });
  console.log("Success:", items.length);
}

main().catch(console.error).finally(() => prisma.$disconnect())
