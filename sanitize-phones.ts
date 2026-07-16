import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando sanitização de telefones...");
  
  const leads = await prisma.lead.findMany({
    select: { id: true, phone: true }
  });

  let leadsUpdated = 0;
  for (const lead of leads) {
    if (lead.phone) {
      const sanitized = lead.phone.replace(/\D/g, '');
      if (sanitized !== lead.phone && sanitized.length > 0) {
        try {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { phone: sanitized }
          });
          leadsUpdated++;
        } catch (e) {
          console.error(`Erro ao atualizar lead ${lead.id}: ${e.message}`);
        }
      }
    }
  }

  const clients = await prisma.client.findMany({
    select: { id: true, phone: true }
  });

  let clientsUpdated = 0;
  for (const client of clients) {
    if (client.phone) {
      const sanitized = client.phone.replace(/\D/g, '');
      if (sanitized !== client.phone && sanitized.length > 0) {
        try {
          await prisma.client.update({
            where: { id: client.id },
            data: { phone: sanitized }
          });
          clientsUpdated++;
        } catch (e) {
          console.error(`Erro ao atualizar client ${client.id}: ${e.message}`);
        }
      }
    }
  }

  console.log(`Concluído! Leads atualizados: ${leadsUpdated}. Clientes atualizados: ${clientsUpdated}`);
}

main().finally(() => prisma.$disconnect());
