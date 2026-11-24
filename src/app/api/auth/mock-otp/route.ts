// A01: mocked OTP sign-in for the demo. Public route; the code comes from
// MOCK_OTP_CODE and the uid is derived deterministically from the phone number.
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, db } from "@/lib/firebase/admin";

const inputSchema = z.object({
  phone: z.string().min(5).max(32),
  code: z.string().min(1).max(16),
  role: z.enum(["client", "technician", "admin"]),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "Invalid input" } }, { status: 400 });
  }
  const { phone, code, role, name } = parsed.data;
  if (code !== (process.env.MOCK_OTP_CODE ?? "123456")) {
    return NextResponse.json({ error: { code: "invalid_code", message: "Incorrect demo code" } }, { status: 400 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (role === "admin" && adminEmails.length === 0) {
    return NextResponse.json(
      { error: { code: "admin_not_configured", message: "ADMIN_EMAILS is not configured" } },
      { status: 400 },
    );
  }

  const uid = `user-${phone.replace(/\D/g, "")}`;
  const claims = { role, admin: role === "admin" };
  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();
  await userRef.set(
    {
      role,
      name: name ?? (typeof existing.get("name") === "string" ? existing.get("name") : uid),
      language: typeof existing.get("language") === "string" ? existing.get("language") : "en",
      createdAt: typeof existing.get("createdAt") === "number" ? existing.get("createdAt") : Date.now(),
    },
    { merge: true },
  );
  await auth.setCustomUserClaims(uid, claims);
  const token = await auth.createCustomToken(uid, claims);
  return NextResponse.json({ token, uid, role });
}
