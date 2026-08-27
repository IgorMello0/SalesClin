import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { name: { contains: "Priscila de Castro Souza Ribeiro" } },
    include: {
      appointments: { orderBy: { createdAt: 'asc' } }
    }
  });
  
  if (lead) {
    console.log(`\n--- APPOINTMENTS ---`);
    for (const appt of lead.appointments) {
      console.log(`[${appt.createdAt.toISOString()}] Status: ${appt.status} | Date: ${appt.date} | Updated: ${appt.updatedAt}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
