import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Iniciando backfill de companyId...");
  
  const profissionais = await prisma.professional.findMany({
    select: { id: true, companyId: true }
  });

  for (const prof of profissionais) {
    if (prof.companyId) {
      console.log(`Atualizando registros do profissional ${prof.id} para companyId ${prof.companyId}...`);
      
      const clients = await prisma.client.updateMany({
        where: { professionalId: prof.id, companyId: null },
        data: { companyId: prof.companyId }
      });
      
      const leads = await prisma.lead.updateMany({
        where: { professionalId: prof.id, companyId: null },
        data: { companyId: prof.companyId }
      });
      
      const apps = await prisma.appointment.updateMany({
        where: { professionalId: prof.id, companyId: null },
        data: { companyId: prof.companyId }
      });
      
      const payments = await prisma.payment.updateMany({
        where: { professionalId: prof.id, companyId: null },
        data: { companyId: prof.companyId }
      });

      console.log(`Profissional ${prof.id}: ${clients.count} clientes, ${leads.count} leads, ${apps.count} apps, ${payments.count} payments atualizados.`);
    }
  }

  console.log("Backfill finalizado.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
