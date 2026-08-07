import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const staff = await prisma.staff.findMany({
    where: { businessId: session.businessId },
    include: {
      availability: true,
      staffServices: { include: { service: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const { name, email } = await req.json();
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const staff = await prisma.staff.create({
    data: { businessId: session.businessId, name, email: email || null },
  });
  return NextResponse.json({ staff }, { status: 201 });
}
