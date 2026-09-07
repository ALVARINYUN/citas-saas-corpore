import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";
import { isForeignKeyRestrictError } from "@/lib/prismaErrors";

async function assertOwnership(serviceId: string, businessId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  return service && service.businessId === businessId ? service : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const { id } = await params;
  const owned = await assertOwnership(id, session.businessId);
  if (!owned) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const service = await prisma.service.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      durationMin: body.durationMin ? Number(body.durationMin) : undefined,
      price: body.price !== undefined ? (body.price ? Number(body.price) : null) : undefined,
      description: body.description ?? undefined,
      capacity: body.capacity !== undefined ? Math.max(1, Number(body.capacity)) : undefined,
      active: body.active ?? undefined,
    },
  });
  return NextResponse.json({ service });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const { id } = await params;
  const owned = await assertOwnership(id, session.businessId);
  if (!owned) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const force = req.nextUrl.searchParams.get("force") === "true";

  // Borrado forzado: el usuario ya vio cuantas citas se van a perder (el
  // conteo se lo dimos en el 409 de abajo) y confirmo explicitamente que
  // quiere borrarlas junto con el servicio. Transaccion para que no quede
  // el servicio a medio borrar si algo falla.
  if (force) {
    await prisma.$transaction([
      prisma.appointment.deleteMany({ where: { serviceId: id } }),
      prisma.service.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  }

  try {
    await prisma.service.delete({ where: { id } });
  } catch (error) {
    if (isForeignKeyRestrictError(error)) {
      const appointmentCount = await prisma.appointment.count({ where: { serviceId: id } });
      return NextResponse.json(
        {
          error:
            "No se puede eliminar: tiene citas asociadas. Desactívalo en su lugar para dejar de ofrecerlo sin perder el historial.",
          appointmentCount,
        },
        { status: 409 }
      );
    }
    throw error;
  }
  return NextResponse.json({ success: true });
}
