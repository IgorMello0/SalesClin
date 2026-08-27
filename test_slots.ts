import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const professionalId = 2; // Assuming 2 based on previous queries (Luiz Carlos)
  const date = "2026-08-24";
  const durationMinutes = 30;
  const isUsuario = "false";
  
  const duration = Number(durationMinutes) || 60
  const SLOT_INTERVAL = 15

  let openHourStr = "08:00";
  let closeHourStr = "20:00";
  
  const prof = await prisma.professional.findUnique({
    where: { id: Number(professionalId) },
    include: { company: { select: { openHour: true, closeHour: true } } }
  })
  if (prof?.company) {
    openHourStr = prof.company.openHour || openHourStr;
    closeHourStr = prof.company.closeHour || closeHourStr;
  }

  const [openH, openM] = openHourStr.split(':').map(Number)
  const [closeH, closeM] = closeHourStr.split(':').map(Number)
  
  const startMinutes = openH * 60 + openM
  const endMinutes = closeH * 60 + closeM
  const totalMinutes = endMinutes - startMinutes

  console.log(`Open: ${openHourStr}, Close: ${closeHourStr}`);
  console.log(`Total Minutes: ${totalMinutes}`);

  const dayStart = new Date(`${date}T00:00:00.000-03:00`)
  const dayEnd   = new Date(`${date}T23:59:59.999-03:00`)
  
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      status: { not: 'cancelado' },
      startTime: { gte: dayStart, lte: dayEnd },
      professionalId: Number(professionalId),
      especialistaId: null
    },
    select: { startTime: true, endTime: true }
  })

  console.log(`Existing appointments: ${existingAppointments.length}`);

  const slots: string[] = []
  const now = new Date()

  for (let m = 0; m <= totalMinutes - duration; m += SLOT_INTERVAL) {
    const currentMin = startMinutes + m
    const slotHour   = Math.floor(currentMin / 60)
    const slotMinute = currentMin % 60
    
    const slotStartStr = `${date}T${String(slotHour).padStart(2,'0')}:${String(slotMinute).padStart(2,'0')}:00-03:00`;
    const slotStart = new Date(slotStartStr)
    const slotEnd   = new Date(slotStart.getTime() + duration * 60000)

    if (isNaN(slotStart.getTime())) {
      console.log(`Invalid date for: ${slotStartStr}`);
      continue;
    }

    if (slotStart < now) {
      continue;
    }

    const hasConflict = existingAppointments.some(apt => {
      const aptStart = new Date(apt.startTime)
      const aptEnd   = new Date(apt.endTime)
      return slotStart < aptEnd && slotEnd > aptStart
    })

    if (!hasConflict) {
      slots.push(`${String(slotHour).padStart(2,'0')}:${String(slotMinute).padStart(2,'0')}`)
    }
  }

  console.log(`Slots found: ${slots.length}`);
  console.log(slots);
}

main().catch(console.error).finally(() => prisma.$disconnect());
