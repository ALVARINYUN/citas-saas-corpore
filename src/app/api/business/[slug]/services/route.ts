import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true } },
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  if (!business.active) {
    return NextResponse.json(
      { error: "Este negocio no está disponible en este momento" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      timezone: business.timezone,
      logoUrl: business.logoUrl,
    },
    services: business.services,
  });
}
