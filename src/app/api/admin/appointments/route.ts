import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const appointments = await prisma.appointment.findMany({
    where: { businessId: session.businessId },
    include: { service: true, staff: true, customer: true },
    orderBy: { startTime: "desc" },
    take: 100,
  });
  return NextResponse.json({ appointments });
}
