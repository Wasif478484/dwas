// Server-side admin guard (spec 10.1 / A01). Routes map the typed error to 403.
import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase/admin";

interface AdminClaims {
  uid: string;
  admin?: boolean;
  email?: string;
}

export class AdminAuthError extends Error {
  readonly status = 403;
  readonly code = "forbidden";
}

export function adminErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  return null;
}

export async function requireAdmin(request: Request): Promise<AdminClaims> {
  const authorization = request.headers.get("authorization") ?? "";
  const raw = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
  if (!raw) throw new AdminAuthError("Bearer token required");

  // Only a Firebase-verified ID token grants admin access — never trust an
  // unsigned/self-issued token, even in demo mode (spec §10.2).
  let claims: AdminClaims;
  try {
    claims = await auth.verifyIdToken(raw);
  } catch {
    throw new AdminAuthError("Invalid token");
  }

  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : undefined;
  const configuredEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (claims.admin === true || (email && configuredEmails.includes(email))) return claims;

  const user = await db.collection("users").doc(claims.uid).get();
  if (user.get("role") === "admin") return claims;
  throw new AdminAuthError("Admin access required");
}
