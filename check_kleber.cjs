const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const client = await prisma.client.findFirst({ 
    where: { name: { contains: 'kleber machado' } }, 
    include: { originLead: { include: { proposals: true } }, payments: true } 
  });
  console.log(JSON.stringify(client, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
