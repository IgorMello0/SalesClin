import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: { name: { contains: "Kah", mode: "insensitive" } },
    include: { sdr: true, company: true }
  });

  console.log(`Found ${leads.length} leads matching 'Kah':`);
  leads.forEach(l => {
    console.log(`ID: ${l.id}, Name: ${l.name}, Status: ${l.status}, UpdatedAt: ${l.updatedAt.toISOString()}, SDR: ${l.sdr?.name}, Company: ${l.company?.name}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
