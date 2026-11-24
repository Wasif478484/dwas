// Spec T09: store the technician's FCM token for match notifications.
import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { technicianIdFromRequest } from "@/lib/auth/demo";

const inputSchema = z.object({
  fcmToken: z.string().min(1).max(512),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "Invalid input" } }, { status: 400 });
  }
  try {
    const uid = await technicianIdFromRequest(request);
    await db.collection("technicians").doc(uid).set(
      { fcmToken: parsed.data.fcmToken, lastActiveAt: Date.now() },
      { merge: true },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: { code: "unavailable", message: "Technician service unavailable" } }, { status: 503 });
  }
}
