import { prisma } from "./prisma";
import { getSession } from "./session";

/**
 * Los super-admins son personas específicas (tú, dueño de la plataforma),
 * identificadas por correo en la variable de entorno SUPER_ADMIN_EMAILS
 * (separados por coma). No es un rol dentro de BusinessRole porque un
 * super-admin no pertenece a un solo negocio — ve todos.
 */
export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) return null;

  const allowedEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) return null;

  const user = await prisma.businessUser.findUnique({ where: { id: session.userId } });
  if (!user || !allowedEmails.includes(user.email.toLowerCase())) return null;

  return user;
}
