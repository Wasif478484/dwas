// A06: resolve (or reopen) a complaint and audit who did it.
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildResolvePayload } from "@/lib/admin/complaints";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/firebase/admin";

const bodySchema = z.object({
  status: z.enum(["open", "resolved"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Invalid complaint input" } }, { status: 400 });
    }
    const { id } = await params;
    const ref = db.collection("complaints").doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: { code: "not_found", message: "Complaint not found" } }, { status: 404 });
    }

    const now = Date.now();
    const { update, auditAction, auditNote } = buildResolvePayload({ ...parsed.data, adminUid: admin.uid, now });
    const batch = db.batch();
    batch.update(ref, update);
    batch.set(db.collection("audit").doc(), {
      actor: admin.uid,
      action: auditAction,
      target: id,
      note: auditNote,
      ts: now,
    });
    await batch.commit();
    return NextResponse.json({
      id,
      status: parsed.data.status,
      resolvedBy: update.resolvedBy ?? null,
      resolvedAt: update.resolvedAt ?? null,
    });
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
