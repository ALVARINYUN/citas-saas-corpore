import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireSession, isSession } from "@/lib/requireSession";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa PNG, JPG, WEBP o SVG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "La imagen no puede pesar más de 2MB" }, { status: 400 });
  }

  // Cada negocio tiene su propia carpeta dentro del Blob store, para no
  // pisar el logo de otro negocio y para poder identificar el archivo.
  const extension = file.name.split(".").pop() ?? "png";
  const blob = await put(`logos/${session.businessId}-${Date.now()}.${extension}`, file, {
    access: "public",
  });

  const business = await prisma.business.update({
    where: { id: session.businessId },
    data: { logoUrl: blob.url },
  });

  return NextResponse.json({ business });
}
