import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/jwt";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const { businessName, email, password } = await req.json();

  if (!businessName || !email || !password) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const baseSlug = slugify(businessName) || "negocio";
  let slug = baseSlug;
  let attempt = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++attempt}`;
  }

  const passwordHash = await hashPassword(password);

  const business = await prisma.business.create({
    data: {
      name: businessName,
      slug,
      users: {
        create: { email, passwordHash, role: "OWNER" },
      },
    },
    include: { users: true },
  });

  const owner = business.users[0];
  const token = await createSessionToken({
    userId: owner.id,
    businessId: business.id,
    role: "OWNER",
  });

  const res = NextResponse.json({ business: { id: business.id, slug: business.slug } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
