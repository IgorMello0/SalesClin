import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({
    where: {
      isActive: true,
      OR: [
        { companyId: 16 },
        {
          companyAccess: {
            some: {
              companyId: 16,
              isActive: true,
            },
          },
        },
      ],
    },
    include: {
      role: true
    }
  });
  console.log('Total users for company 16:', users.length);
  users.forEach(u => {
    console.log(`- ${u.name} | isSpecialist: ${u.role?.isSpecialist}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
