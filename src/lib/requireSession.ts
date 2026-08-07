import { NextResponse } from "next/server";
import { getSession } from "./session";
import { SessionPayload } from "./jwt";

/** Devuelve la sesión válida o lanza una respuesta 401 lista para retornar. */
export async function requireSession(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return session;
}

export function isSession(value: SessionPayload | NextResponse): value is SessionPayload {
  return !(value instanceof NextResponse);
}
