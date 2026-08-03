import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const a = await prisma.appointment.findMany({ orderBy: { id: 'desc' }, take: 5 });
  console.log(a);
}
main().finally(() => prisma.$disconnect());
