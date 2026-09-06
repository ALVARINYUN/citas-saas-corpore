import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/jwt";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  // Nota: el email es único por negocio (@@unique([businessId, email])), no
  // globalmente. Si en el futuro una misma persona administra varios
  // negocios con el mismo correo, aquí habría que dejarle elegir cuál.
  // Por ahora se toma la primera coincidencia.
  const user = await prisma.businessUser.findFirst({
    where: { email },
    include: { business: true },
  });

  // Bloqueo por fuerza bruta guardado en BD (BusinessUser.failedLoginAttempts
  // / lastFailedLoginAt), no en memoria del proceso -- en Vercel cada
  // invocación puede correr en una instancia distinta, así que una variable
  // en memoria no sirve para contar intentos entre peticiones.
  const lockedOut =
    user &&
    user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS &&
    user.lastFailedLoginAt &&
    Date.now() - user.lastFailedLoginAt.getTime() < LOCKOUT_WINDOW_MS;

  if (lockedOut) {
    return NextResponse.json(
      { error: "Demasiados intentos, espera unos minutos." },
      { status: 429 }
    );
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    if (user) {
      // Si la ventana de 15 min desde el último fallo ya expiró, el conteo
      // arranca de nuevo en vez de seguir acumulando fallos viejos.
      const withinWindow =
        user.lastFailedLoginAt &&
        Date.now() - user.lastFailedLoginAt.getTime() < LOCKOUT_WINDOW_MS;
      await prisma.businessUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: (withinWindow ? user.failedLoginAttempts : 0) + 1,
          lastFailedLoginAt: new Date(),
        },
      });
    }
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  if (user.failedLoginAttempts > 0) {
    await prisma.businessUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lastFailedLoginAt: null },
    });
  }

  if (!user.business.active) {
    return NextResponse.json(
      { error: "Este negocio fue desactivado. Contacta al soporte de la plataforma." },
      { status: 403 }
    );
  }

  const token = await createSessionToken({
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
