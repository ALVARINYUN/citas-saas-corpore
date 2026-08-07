import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const searchParams = req.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId");
  const dateParam = searchParams.get("date"); // formato: YYYY-MM-DD

  if (!serviceId || !dateParam) {
    return NextResponse.json(
      { error: "Faltan parámetros: serviceId y date son obligatorios" },
      { status: 400 }
    );
  }

  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const date = new Date(`${dateParam}T00:00:00`);
  const slots = await getAvailableSlots(business.id, serviceId, date);

  return NextResponse.json({ slots });
}
