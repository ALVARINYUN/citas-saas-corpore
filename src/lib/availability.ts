import { prisma } from "./prisma";

interface TimeSlot {
  start: Date;
  end: Date;
  staffId: string;
  staffName: string;
}

/**
 * Calcula los horarios disponibles para un servicio en una fecha dada,
 * revisando la disponibilidad recurrente de cada miembro del staff
 * y descartando los espacios que chocan con citas ya confirmadas.
 */
export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) return [];

  const dayOfWeek = date.getDay();

  // Staff que puede atender este servicio y trabaja ese día de la semana
  const eligibleStaff = await prisma.staff.findMany({
    where: {
      businessId,
      active: true,
      staffServices: { some: { serviceId } },
      availability: { some: { dayOfWeek } },
    },
    include: {
      availability: { where: { dayOfWeek } },
    },
  });

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Citas ya existentes ese día, para descartar solapamientos
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      startTime: { gte: dayStart, lte: dayEnd },
    },
  });

  const slots: TimeSlot[] = [];
  const stepMinutes = 15; // granularidad de los horarios ofrecidos

  for (const staff of eligibleStaff) {
    for (const window of staff.availability) {
      const [startH, startM] = window.startTime.split(":").map(Number);
      const [endH, endM] = window.endTime.split(":").map(Number);

      const windowStart = new Date(date);
      windowStart.setHours(startH, startM, 0, 0);
      const windowEnd = new Date(date);
      windowEnd.setHours(endH, endM, 0, 0);

      let cursor = new Date(windowStart);

      while (cursor.getTime() + service.durationMin * 60000 <= windowEnd.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + service.durationMin * 60000);

        const overlaps = existingAppointments.some(
          (appt) =>
            appt.staffId === staff.id &&
            slotStart < appt.endTime &&
            slotEnd > appt.startTime
        );

        if (!overlaps && slotStart > new Date()) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            staffId: staff.id,
            staffName: staff.name,
          });
        }

        cursor = new Date(cursor.getTime() + stepMinutes * 60000);
      }
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}
