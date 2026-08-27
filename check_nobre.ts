import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const nobre = await prisma.empresa.findFirst({
    where: { name: { contains: 'Nobre' } }
  });

  if (!nobre) {
    console.log('Nobre Odontologia not found');
    return;
  }

  console.log(`Found Nobre Odontologia: ${nobre.id} - ${nobre.name}`);

  const accesses = await prisma.userCompanyAccess.findMany({
    where: { companyId: nobre.id },
    include: { user: true }
  });

  console.log(`Users with access to ${nobre.name}:`);
  for (const a of accesses) {
    console.log(`- ${a.user.name} (${a.user.email}, ID: ${a.userId})`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
