import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const phoneSearch = "31985110353";
  const phoneSearch2 = "5531985110353"; // just in case

  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { phone: { contains: "85110353" } },
        { name: { contains: "Catia", mode: "insensitive" } }
      ]
    },
    include: {
      company: true,
      sdr: true,
      closer: true,
      especialista: true,
      convertedToClient: true,
    }
  });

  console.log(`Encontrados ${leads.length} leads:`);
  for (const lead of leads) {
    console.log(`- ID: ${lead.id}`);
    console.log(`  Nome: ${lead.name}`);
    console.log(`  Telefone: ${lead.phone}`);
    console.log(`  Empresa: ${lead.company?.name} (ID: ${lead.companyId})`);
    console.log(`  Status: ${lead.status} | SubStatus: ${lead.subStatus}`);
    console.log(`  SDR: ${lead.sdr?.name} (ID: ${lead.sdrId})`);
    console.log(`  Closer: ${lead.closer?.name} (ID: ${lead.closerId})`);
    console.log(`  Especialista: ${lead.especialista?.name} (ID: ${lead.especialistaId})`);
    console.log(`  Convertido em Cliente? ${!!lead.convertedToClientId} (Client ID: ${lead.convertedToClientId})`);
    console.log(`  Data de criação: ${lead.createdAt.toISOString()}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
