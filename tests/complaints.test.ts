import { describe, expect, it } from "vitest";
import {
  buildResolvePayload,
  filterAndSortComplaints,
  type ComplaintDoc,
  type ComplaintStatus,
} from "@/lib/admin/complaints";

const NOW = Date.UTC(2026, 0, 3, 12, 0, 0);

function complaint(id: string, createdAt: number, status: ComplaintStatus = "open"): ComplaintDoc {
  return { id, kind: "price", text: ` complaint ${id}`, bookingId: `b-${id}`, status, createdAt };
}

describe("complaints queue (A06)", () => {
  it("filters by status and sorts newest first before limiting", () => {
    const items = [
      complaint("old-open", NOW - 3_000),
      complaint("new-resolved", NOW, "resolved"),
      complaint("new-open", NOW - 1_000),
      complaint("old-resolved", NOW - 2_000, "resolved"),
    ];
    expect(filterAndSortComplaints(items, "resolved").map((item) => item.id)).toEqual([
      "new-resolved", "old-resolved",
    ]);
    expect(filterAndSortComplaints(items, "open").map((item) => item.id)).toEqual([
      "new-open", "old-open",
    ]);
    expect(filterAndSortComplaints(items).map((item) => item.id)).toEqual([
      "new-resolved", "new-open", "old-resolved", "old-open",
    ]);
  });

  it("caps the list at 100 and does not mutate the input", () => {
    const items = Array.from({ length: 120 }, (_, i) => complaint(`c-${i}`, NOW + i));
    const original = items.slice();
    const result = filterAndSortComplaints(items);
    expect(result).toHaveLength(100);
    expect(result[0].id).toBe("c-119");
    expect(items).toEqual(original);
  });

  it("builds a resolve payload that records who resolved it", () => {
    expect(buildResolvePayload({ status: "resolved", adminUid: "admin-1", now: NOW })).toEqual({
      update: { status: "resolved", resolvedBy: "admin-1", resolvedAt: NOW },
      auditAction: "complaint_resolved",
      auditNote: null,
    });
  });

  it("includes a provided note in the complaint update and the audit", () => {
    const payload = buildResolvePayload({
      status: "resolved", adminUid: "admin-1", now: NOW, note: "refunded",
    });
    expect(payload.update).toEqual({
      status: "resolved", resolvedBy: "admin-1", resolvedAt: NOW, note: "refunded",
    });
    expect(payload.auditNote).toBe("refunded");
  });

  it("audits a reopen without overwriting resolution metadata", () => {
    expect(buildResolvePayload({ status: "open", adminUid: "admin-1", now: NOW })).toEqual({
      update: { status: "open" },
      auditAction: "complaint_reopened",
      auditNote: null,
    });
  });
});
