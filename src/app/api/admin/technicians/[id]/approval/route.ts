// A02: admin approves, rejects or suspends a technician and writes an audit record.
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/firebase/admin";
import { recomputeTechnicianTrust } from "@/lib/trust/score";
import type { Approval } from "@/lib/types";

const inputSchema = z.object({
  action: z.enum(["approve", "reject", "suspend"]),
  note: z.string().max(500).optional(),
});

const STATUS: Record<z.infer<typeof inputSchema>["action"], Approval> = {
  approve: "approved",
  reject: "rejected",
  suspend: "suspended",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Invalid input" } }, { status: 400 });
    }
    const { id } = await params;
    const techRef = db.collection("technicians").doc(id);
    const tech = await techRef.get();
    if (!tech.exists) {
      return NextResponse.json({ error: { code: "not_found", message: "Technician not found" } }, { status: 404 });
    }

    const status = STATUS[parsed.data.action];
    const batch = db.batch();
    // Badges are rebuilt by the shared helper so manual badges survive.
    batch.update(techRef, { approvalStatus: status });
    batch.set(db.collection("audit").doc(), {
      actor: admin.uid,
      action: `technician_${parsed.data.action}`,
      target: `technicians/${id}`,
      note: parsed.data.note ?? null,
      ts: Timestamp.now(),
    });
    await batch.commit();
    await recomputeTechnicianTrust(db, id);
    return NextResponse.json({ id, approvalStatus: status });
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
