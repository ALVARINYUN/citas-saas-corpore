import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

async function assertOwnership(staffId: string, businessId: string) {
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  return staff && staff.businessId === businessId ? staff : null;
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

  const staff = await prisma.staff.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      email: body.email ?? undefined,
      active: body.active ?? undefined,
    },
  });

  // Si vienen serviceIds, se reemplaza la lista completa de servicios que
  // atiende este miembro del staff (más simple que ir agregando/quitando uno a uno).
  if (Array.isArray(body.serviceIds)) {
    await prisma.staffService.deleteMany({ where: { staffId: id } });
    await prisma.staffService.createMany({
      data: body.serviceIds.map((serviceId: string) => ({ staffId: id, serviceId })),
    });
  }

  return NextResponse.json({ staff });
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

  await prisma.staff.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
