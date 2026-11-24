// Server-safe demo auth bridge: verified Firebase uid or local demo header.
export const DEFAULT_TECHNICIAN_ID = "rafiq-ahmad";

export async function technicianIdFromRequest(request: Request): Promise<string> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    try {
      // shortcut: dynamic import keeps the Admin SDK out of the client bundle.
      const { auth } = await import("@/lib/firebase/admin");
      const decoded = await auth.verifyIdToken(bearer);
      if (decoded.uid) return decoded.uid;
    } catch {
      // Invalid/expired token: fall through to the demo header.
    }
  }
  return request.headers.get("x-demo-technician-id") || DEFAULT_TECHNICIAN_ID;
}
