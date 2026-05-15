import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.usuario.updateMany({
    data: {
      onboardingCompleted: true,
    },
  });
  
  await prisma.professional.updateMany({
    data: {
      onboardingCompleted: true,
    },
  });

  console.log('All existing users and professionals have been marked with onboardingCompleted = true.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
