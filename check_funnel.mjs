import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const stages = await prisma.funnelStage.findMany();
  console.log(JSON.stringify(stages, null, 2));
}
main().finally(() => prisma.$disconnect());
