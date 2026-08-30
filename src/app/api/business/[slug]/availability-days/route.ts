import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Devuelve qué días de un mes tienen AL MENOS un horario disponible para un
 * servicio, para pintar el calendario público. Es una aproximación liviana
 * a propósito: en vez de calcular el cupo exacto día por día (lo que
 * implicaría correr getAvailableSlots ~30 veces por petición), solo revisa
 * qué días de la semana trabaja el staff asignado a este servicio. Un día
 * puede aparecer "disponible" y terminar sin cupo real si ya se llenó --
 * la consulta de horarios de ese día (GET .../availability) es la que manda
 * la última palabra, esta ruta es solo para pintar el calendario.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const searchParams = req.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId");
  const monthParam = searchParams.get("month"); // formato: YYYY-MM

  if (!serviceId || !monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "Faltan parámetros: serviceId y month (YYYY-MM) son obligatorios" },
      { status: 400 }
    );
  }

  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const [year, month] = monthParam.split("-").map(Number);

  const eligibleStaff = await prisma.staff.findMany({
    where: {
      businessId: business.id,
      active: true,
      staffServices: { some: { serviceId } },
    },
    include: { availability: { select: { dayOfWeek: true } } },
  });

  const workingDaysOfWeek = new Set<number>();
  for (const staff of eligibleStaff) {
    for (const a of staff.availability) workingDaysOfWeek.add(a.dayOfWeek);
  }

  // Date.UTC(year, month, 0) cae en el último día del mes `month` (1-indexado)
  // porque el índice de mes de JS es 0-indexado: pedir el día 0 del "mes
  // siguiente" da el último día del mes que nos interesa.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // "Hoy" en la zona del negocio, no la del servidor -- no tendría sentido
  // ofrecer un día que ya pasó en Bogotá solo porque el servidor (en UTC)
  // todavía no llega a medianoche.
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: business.timezone }).format(
    new Date()
  );

  const availableDates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateKey < todayKey) continue;

    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (workingDaysOfWeek.has(dayOfWeek)) availableDates.push(dateKey);
  }

  return NextResponse.json({ availableDates });
}
