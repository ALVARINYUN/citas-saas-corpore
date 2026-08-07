import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

async function assertOwnership(staffId: string, businessId: string) {
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  return staff && staff.businessId === businessId ? staff : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const { id } = await params;
  const owned = await assertOwnership(id, session.businessId);
  if (!owned) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { dayOfWeek, startTime, endTime } = await req.json();
  if (dayOfWeek === undefined || !startTime || !endTime) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const availability = await prisma.staffAvailability.create({
    data: { staffId: id, dayOfWeek: Number(dayOfWeek), startTime, endTime },
  });
  return NextResponse.json({ availability }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const availabilityId = req.nextUrl.searchParams.get("availabilityId");
  if (!availabilityId) {
    return NextResponse.json({ error: "Falta availabilityId" }, { status: 400 });
  }

  const availability = await prisma.staffAvailability.findUnique({
    where: { id: availabilityId },
    include: { staff: true },
  });
  if (!availability || availability.staff.businessId !== session.businessId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.staffAvailability.delete({ where: { id: availabilityId } });
  return NextResponse.json({ success: true });
}
