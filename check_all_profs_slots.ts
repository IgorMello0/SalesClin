import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const date = "2026-08-24";
  const duration = 30;
  const SLOT_INTERVAL = 15;
  const now = new Date();

  // Test for all professionals
  const profs = await prisma.professional.findMany({
    include: { company: { select: { openHour: true, closeHour: true } } }
  });

  for (const prof of profs) {
    let openHourStr = prof.company?.openHour || "08:00";
    let closeHourStr = prof.company?.closeHour || "20:00";
    
    const [openH, openM] = openHourStr.split(':').map(Number)
    const [closeH, closeM] = closeHourStr.split(':').map(Number)
    
    const startMinutes = openH * 60 + openM
    const endMinutes = closeH * 60 + closeM
    const totalMinutes = endMinutes - startMinutes

    const dayStart = new Date(`${date}T00:00:00.000-03:00`)
    const dayEnd   = new Date(`${date}T23:59:59.999-03:00`)
    
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        status: { not: 'cancelado' },
        startTime: { gte: dayStart, lte: dayEnd },
        professionalId: prof.id,
        especialistaId: null
      },
      select: { startTime: true, endTime: true }
    });

    const slots: string[] = []
    for (let m = 0; m <= totalMinutes - duration; m += SLOT_INTERVAL) {
      const currentMin = startMinutes + m
      const slotHour   = Math.floor(currentMin / 60)
      const slotMinute = currentMin % 60
      
      const slotStart = new Date(`${date}T${String(slotHour).padStart(2,'0')}:${String(slotMinute).padStart(2,'0')}:00-03:00`)
      const slotEnd   = new Date(slotStart.getTime() + duration * 60000)

      if (slotStart < now) continue;

      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.startTime)
        const aptEnd   = new Date(apt.endTime)
        return slotStart < aptEnd && slotEnd > aptStart
      });

      if (!hasConflict) slots.push(`${slotHour}:${slotMinute}`);
    }

    if (slots.length === 0) {
      console.log(`Prof ${prof.id} (${prof.name}) has NO SLOTS on ${date}. Open: ${openHourStr}, Close: ${closeHourStr}, Appointments: ${existingAppointments.length}`);
    }
  }

  // Also test for all usuarios (especialistas)
  const users = await prisma.usuario.findMany({
    include: { company: { select: { openHour: true, closeHour: true } } }
  });

  for (const user of users) {
    let openHourStr = user.company?.openHour || "08:00";
    let closeHourStr = user.company?.closeHour || "20:00";
    
    const [openH, openM] = openHourStr.split(':').map(Number)
    const [closeH, closeM] = closeHourStr.split(':').map(Number)
    
    const startMinutes = openH * 60 + openM
    const endMinutes = closeH * 60 + closeM
    const totalMinutes = endMinutes - startMinutes

    const dayStart = new Date(`${date}T00:00:00.000-03:00`)
    const dayEnd   = new Date(`${date}T23:59:59.999-03:00`)
    
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        status: { not: 'cancelado' },
        startTime: { gte: dayStart, lte: dayEnd },
        especialistaId: user.id
      },
      select: { startTime: true, endTime: true }
    });

    const slots: string[] = []
    for (let m = 0; m <= totalMinutes - duration; m += SLOT_INTERVAL) {
      const currentMin = startMinutes + m
      const slotHour   = Math.floor(currentMin / 60)
      const slotMinute = currentMin % 60
      
      const slotStart = new Date(`${date}T${String(slotHour).padStart(2,'0')}:${String(slotMinute).padStart(2,'0')}:00-03:00`)
      const slotEnd   = new Date(slotStart.getTime() + duration * 60000)

      if (slotStart < now) continue;

      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.startTime)
        const aptEnd   = new Date(apt.endTime)
        return slotStart < aptEnd && slotEnd > aptStart
      });

      if (!hasConflict) slots.push(`${slotHour}:${slotMinute}`);
    }

    if (slots.length === 0) {
      console.log(`User ${user.id} (${user.name}) has NO SLOTS on ${date}. Open: ${openHourStr}, Close: ${closeHourStr}, Appointments: ${existingAppointments.length}`);
    }
  }

  console.log("Done checking all professionals and users.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
