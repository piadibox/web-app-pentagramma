import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export type SessionPayload = {
  sub?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies(); // <- nella tua versione è async
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret"
  );

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
