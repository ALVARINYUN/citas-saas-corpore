import { prisma } from "./prisma";

interface TimeSlot {
  start: Date;
  end: Date;
  staffId: string;
  staffName: string;
}

/**
 * Convierte una hora de pared (año, mes, día, hora, minuto) interpretada en
 * `timeZone` al instante UTC real que representa. Necesario porque `Date`
 * solo sabe construir horas en la zona local del proceso (UTC en Vercel),
 * no en la zona del negocio (business.timezone).
 */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Instante "candidato": las mismas componentes de pared, pero tratadas
  // como si fueran UTC.
  const candidate = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // ¿Qué hora de pared muestra ese instante en la zona del negocio?
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(candidate))) parts[p.type] = p.value;

  const shownAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  // La diferencia entre lo que pedimos y lo que se ve en esa zona es el
  // offset real de la zona en ese instante (ya contempla DST si aplica).
  const offset = candidate - shownAsUtc;
  return new Date(candidate + offset);
}

/**
 * Calcula los horarios disponibles para un servicio en una fecha dada,
 * revisando la disponibilidad recurrente de cada miembro del staff
 * y descartando los espacios que chocan con citas ya confirmadas.
 *
 * `dateStr` es la fecha calendario ("YYYY-MM-DD") tal como la eligió el
 * cliente, y `timeZone` es business.timezone: todas las horas de
 * disponibilidad (StaffAvailability.startTime/endTime) se interpretan en
 * esa zona, no en la del servidor donde corre el código.
 */
export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  dateStr: string,
  timeZone: string
): Promise<TimeSlot[]> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) return [];

  const [year, month, day] = dateStr.split("-").map(Number);

  // El día de la semana de una fecha calendario no depende de ninguna zona
  // horaria: es una propiedad pura del calendario.
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

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

  const dayStart = zonedTimeToUtc(year, month, day, 0, 0, timeZone);
  const dayEnd = zonedTimeToUtc(year, month, day, 23, 59, timeZone);

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

      const windowStart = zonedTimeToUtc(year, month, day, startH, startM, timeZone);
      const windowEnd = zonedTimeToUtc(year, month, day, endH, endM, timeZone);

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
