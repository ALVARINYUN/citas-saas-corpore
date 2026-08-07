import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, SessionPayload } from "./jwt";

/** Lee y valida la sesión del negocio autenticado en la petición actual. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
