import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dayStart = new Date(`2026-08-24T00:00:00.000-03:00`)
  const dayEnd   = new Date(`2026-08-24T23:59:59.999-03:00`)
  
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { not: 'cancelado' },
      startTime: { gte: dayStart, lte: dayEnd }
    },
    include: { professional: { select: { id: true, name: true } }, especialista: { select: { id: true, name: true } } }
  });

  console.log(`Found ${appointments.length} appointments on 2026-08-24`);
  for (const apt of appointments) {
    console.log(`- Apt ID: ${apt.id} | Start: ${apt.startTime.toISOString()} | End: ${apt.endTime.toISOString()} | Prof: ${apt.professional?.name} | Esp: ${apt.especialista?.name} | Status: ${apt.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
