// Spec §8.1: POST /api/bookings. Firebase Admin SDK (Node APIs).
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { DocumentReference } from "firebase-admin/firestore";
import { auth, db } from "@/lib/firebase/admin";
import { REQUEST_EXPIRY_SEC } from "@/lib/config";
import { TransitionError, type Actor } from "@/lib/booking/machine";
import type { BookingDoc, Role } from "@/lib/types";

// Shared route plumbing lives here so the booking sub-routes stay one-liners.
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function fail(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof TransitionError) return fail(error.code, error.message, 409);
  if (error instanceof ApiError) return fail(error.code, error.message, error.status);
  console.error(error);
  return fail("internal_error", "Internal error", 500);
}

export async function getActor(request: Request): Promise<{ uid: string; role: Role; actor: Actor }> {
  const header = request.headers.get("authorization");
  let uid: string;
  if (!header) {
    // Demo fallback until OTP lands: the header picks an identity, never a role.
    uid = request.headers.get("x-demo-technician-id") || "demo-client";
  } else {
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) throw new ApiError("unauthorized", 401, "Invalid Authorization header");
    try {
      uid = (await auth.verifyIdToken(token)).uid;
    } catch {
      throw new ApiError("unauthorized", 401, "Invalid or expired token");
    }
  }
  const snap = await db.collection("users").doc(uid).get();
  const stored = snap.data()?.role;
  const role: Role = stored === "technician" || stored === "admin" ? stored : "client";
  return { uid, role, actor: role };
}

export async function logEvent(
  type: string,
  actor: Actor,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.collection("events").add({ type, actorRole: actor, ts: Date.now(), ...extra });
  } catch {
    // Events are best-effort: never fail the booking write.
  }
}

export async function readBooking(id: string): Promise<{ ref: DocumentReference; booking: BookingDoc }> {
  const ref = db.collection("bookings").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError("not_found", 404, "Booking not found");
  return { ref, booking: snap.data() as BookingDoc };
}

export function assertParticipant(booking: BookingDoc, uid: string, role: Role): void {
  if (role !== "admin" && booking.clientId !== uid && booking.technicianId !== uid) {
    throw new ApiError("forbidden", 403, "Not a participant in this booking");
  }
}

const createSchema = z.object({
  technicianId: z.string().min(1).optional(),
  quick: z.boolean().optional(),
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"]),
  jobType: z.string().min(1),
  problemRaw: z.string().optional(),
  summary_en: z.string().optional(),
  summary_ur: z.string().optional(),
  urgency: z.enum(["now", "today", "tomorrow", "flexible"]).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    areaId: z.string().optional(),
    note: z.string().optional(),
  }),
  priceBand: z.object({ min: z.number(), max: z.number() }).nullable().optional(),
  candidates: z.array(z.string()).max(5).optional(),
  photoUrls: z.array(z.string()).optional(),
  scheduledFor: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const { uid, actor } = await getActor(request);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("invalid_input", "Invalid booking input", 400);
    const input = parsed.data;
    const candidates = input.candidates ?? (input.technicianId ? [input.technicianId] : []);
    if (!input.technicianId && !input.quick) return fail("invalid_input", "technicianId or quick is required", 400);
    if (!candidates.length) return fail("invalid_input", "At least one candidate is required", 400);

    const now = Date.now();
    const ref = db.collection("bookings").doc();
    const booking: BookingDoc = {
      id: ref.id,
      clientId: uid,
      technicianId: input.technicianId ?? candidates[0],
      trade: input.trade,
      jobType: input.jobType,
      problemRaw: input.problemRaw ?? "",
      summary_en: input.summary_en ?? "",
      summary_ur: input.summary_ur ?? "",
      urgency: input.urgency ?? "today",
      location: input.location,
      priceBand: input.priceBand ?? null,
      status: "requested",
      statusHistory: [{ status: "requested", at: now, actor }],
      candidates,
      attempts: [],
      expiresAt: now + REQUEST_EXPIRY_SEC * 1000,
      photoUrls: input.photoUrls ?? [],
      phoneRevealed: false,
      shareToken: randomUUID(),
      createdAt: now,
      ...(input.scheduledFor !== undefined ? { scheduledFor: input.scheduledFor } : {}),
    };
    await ref.set(booking);
    await logEvent("booking_created", actor, { bookingId: ref.id });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
