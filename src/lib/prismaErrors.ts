import { Prisma } from "@prisma/client";

/**
 * Detecta el borrado rechazado por una relación RESTRICT (ej: intentar
 * eliminar un Service o Staff que todavía tiene Appointment asociados).
 *
 * Con el driver adapter de Postgres (@prisma/adapter-pg) este caso no llega
 * como el P2003 "de libro" de Prisma -- llega envuelto en un
 * PrismaClientKnownRequestError con code P2039, con el mensaje real de
 * Postgres (RESTRICT ... foreign key constraint) dentro de
 * `error.meta.driverAdapterError`. Se revisan ambos códigos para no
 * depender de un detalle interno del driver adapter que podría cambiar.
 */
export function isForeignKeyRestrictError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2003") return true;
  if (error.code === "P2039") {
    const driverMessage = String(error.meta?.driverAdapterError ?? "");
    return /RESTRICT|foreign key constraint/i.test(driverMessage);
  }
  return false;
}
