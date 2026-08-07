import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Falta SESSION_SECRET en .env — genera una cadena aleatoria larga y ponla ahí."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  businessId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  [key: string]: unknown; // requerido por la firma genérica de jose
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
