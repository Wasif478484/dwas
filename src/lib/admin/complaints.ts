// A06: pure helpers for the complaints queue. No server imports so the admin
// page can share the document type with the two API routes.
export type ComplaintStatus = "open" | "resolved";
export type ComplaintKind = "price" | "no_show" | "quality" | "other";

export interface ComplaintDoc {
  id: string;
  kind: ComplaintKind;
  text: string;
  bookingId: string;
  clientId?: string;
  technicianId?: string;
  status: ComplaintStatus;
  raisedBy?: string;
  resolvedBy?: string;
  resolvedAt?: number;
  note?: string;
  createdAt: number;
}

export const COMPLAINT_LIMIT = 100;

export function filterAndSortComplaints(
  items: ComplaintDoc[],
  status?: ComplaintStatus,
  limit = COMPLAINT_LIMIT,
): ComplaintDoc[] {
  const filtered = status ? items.filter((item) => item.status === status) : items.slice();
  return filtered
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, limit);
}

export interface ResolvePayload {
  update: Record<string, string | number>;
  auditAction: "complaint_resolved" | "complaint_reopened";
  auditNote: string | null;
}

export function buildResolvePayload(input: {
  status: ComplaintStatus;
  adminUid: string;
  now: number;
  note?: string;
}): ResolvePayload {
  const { status, adminUid, now, note } = input;
  if (status === "open") {
    return { update: { status: "open" }, auditAction: "complaint_reopened", auditNote: note ?? null };
  }
  const update: Record<string, string | number> = { status: "resolved", resolvedBy: adminUid, resolvedAt: now };
  if (note) update.note = note;
  return { update, auditAction: "complaint_resolved", auditNote: note ?? null };
}
