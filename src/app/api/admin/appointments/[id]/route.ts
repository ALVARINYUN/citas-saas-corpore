import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment || appointment.businessId !== session.businessId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const { status } = await req.json();
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json({ appointment: updated });
}
