import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const business = await prisma.business.findUnique({ where: { id: session.businessId } });
  return NextResponse.json({ business });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const { name, address, description } = await req.json();

  const business = await prisma.business.update({
    where: { id: session.businessId },
    data: {
      name: name ?? undefined,
      address: address ?? undefined,
      description: description ?? undefined,
    },
  });
  return NextResponse.json({ business });
}
