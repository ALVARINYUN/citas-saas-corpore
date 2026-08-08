import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superAdmin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const { active } = await req.json();

  const business = await prisma.business.update({ where: { id }, data: { active } });
  return NextResponse.json({ business });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  // onDelete: Cascade en el esquema se encarga de borrar todo lo relacionado
  // (servicios, staff, citas, usuarios, etc.) de ese negocio.
  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
