import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const services = await prisma.service.findMany({
    where: { businessId: session.businessId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const { name, durationMin, price, description, capacity } = await req.json();
  if (!name || !durationMin) {
    return NextResponse.json({ error: "Nombre y duración son obligatorios" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      businessId: session.businessId,
      name,
      durationMin: Number(durationMin),
      price: price ? Number(price) : null,
      description: description || null,
      capacity: capacity ? Math.max(1, Number(capacity)) : 1,
    },
  });
  return NextResponse.json({ service }, { status: 201 });
}
