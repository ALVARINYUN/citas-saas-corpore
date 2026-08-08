import { prisma } from "./prisma";

export class SlotTakenError extends Error {
  constructor() {
    super("SLOT_TAKEN");
  }
}

interface CreateAppointmentInput {
  businessId: string;
  serviceId: string;
  staffId: string;
  startTime: Date;
  customer: { name: string; email?: string; phone?: string };
  notes?: string;
}

/**
 * Crea una cita de forma atómica, revalidando disponibilidad dentro de la
 * misma transacción para que dos personas (o un cliente en la web y otro
 * por WhatsApp al mismo tiempo) no puedan tomar el mismo horario.
 */
export async function createAppointment(input: CreateAppointmentInput) {
  const { businessId, serviceId, staffId, startTime, customer, notes } = input;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new Error("SERVICE_NOT_FOUND");

  const endTime = new Date(startTime.getTime() + service.durationMin * 60000);

  return prisma.$transaction(async (tx) => {
    if (service.capacity <= 1) {
      // Servicio individual: cualquier cita del staff (de cualquier
      // servicio) que se solape en el tiempo lo bloquea -- el profesional
      // no puede estar en dos citas que se crucen, aunque no empiecen a
      // la misma hora exacta (ej: un servicio de 50 min a las 9:00 choca
      // con uno que arranque a las 9:15).
      const conflict = await tx.appointment.findFirst({
        where: {
          staffId,
          status: { not: "CANCELLED" },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (conflict) throw new SlotTakenError();
    } else {
      // Servicio con cupo (ej: clase grupal): se cuentan las citas de este
      // mismo staff+servicio+hora exacta de inicio, y se compara contra
      // el cupo.
      const bookedCount = await tx.appointment.count({
        where: {
          staffId,
          serviceId,
          status: { not: "CANCELLED" },
          startTime,
        },
      });
      if (bookedCount >= service.capacity) throw new SlotTakenError();
    }

    let customerRecord = customer.phone
      ? await tx.customer.findFirst({ where: { businessId, phone: customer.phone } })
      : null;

    if (!customerRecord) {
      customerRecord = await tx.customer.create({
        data: {
          businessId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      });
    }

    return tx.appointment.create({
      data: {
        businessId,
        serviceId,
        staffId,
        customerId: customerRecord.id,
        startTime,
        endTime,
        notes,
      },
      include: { service: true, staff: true, customer: true },
    });
  });
}

/** Citas futuras y confirmadas de un cliente, por teléfono, para ofrecer cancelación. */
export async function getUpcomingAppointmentsByPhone(businessId: string, phone: string) {
  return prisma.appointment.findMany({
    where: {
      businessId,
      status: "CONFIRMED",
      startTime: { gte: new Date() },
      customer: { phone },
    },
    include: { service: true },
    orderBy: { startTime: "asc" },
    take: 5,
  });
}

export async function cancelAppointment(appointmentId: string) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });
}
