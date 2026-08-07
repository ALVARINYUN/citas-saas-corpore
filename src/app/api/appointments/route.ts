import { NextRequest, NextResponse } from "next/server";
import { createAppointment, SlotTakenError } from "@/lib/appointments";
import { sendAppointmentConfirmation } from "@/lib/whatsapp";

interface CreateAppointmentBody {
  businessId: string;
  serviceId: string;
  staffId: string;
  startTime: string; // ISO string
  customer: { name: string; email?: string; phone?: string };
  notes?: string;
}

export async function POST(req: NextRequest) {
  const body: CreateAppointmentBody = await req.json();
  const { businessId, serviceId, staffId, startTime, customer, notes } = body;

  if (!businessId || !serviceId || !staffId || !startTime || !customer?.name) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const appointment = await createAppointment({
      businessId,
      serviceId,
      staffId,
      startTime: new Date(startTime),
      customer,
      notes,
    });

    // El envío de WhatsApp nunca debe tumbar la creación de la cita: si falla
    // (plantilla no aprobada, número inválido, etc.) la cita ya quedó guardada.
    if (customer.phone) {
      sendAppointmentConfirmation({
        phone: customer.phone,
        customerName: customer.name,
        serviceName: appointment.service.name,
        dateTimeLabel: appointment.startTime.toLocaleString("es-CO", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }).catch((err) => console.error("Fallo al enviar WhatsApp:", err));
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json(
        { error: "Ese horario ya fue reservado, elige otro" },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Error al crear la cita" }, { status: 500 });
  }
}
