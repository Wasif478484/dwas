// Spec T02/T07: read and update the signed-in technician's own document.
import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { AREAS } from "@/lib/areas";
import { TECH_IDLE_OFFLINE_HOURS } from "@/lib/config";
import { DEFAULT_TECHNICIAN_ID, technicianIdFromRequest } from "@/lib/auth/demo";
import type { GeoPoint, TechnicianDoc } from "@/lib/types";

const TRADES = ["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"] as const;

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  trades: z.array(z.enum(TRADES)).optional(),
  yearsExperience: z.number().min(0).max(60).optional(),
  areaId: z.string().optional(),
  radiusKm: z.number().min(1).max(50).optional(),
  visitFeePKR: z.number().min(0).max(1_000_000).optional(),
  bio_ur: z.string().max(1000).optional(),
  bio_en: z.string().max(1000).optional(),
  photoUrl: z.string().max(2048).optional(),
  workPhotos: z.array(z.string().max(2048)).max(12).optional(),
  isOnline: z.boolean().optional(),
});

function defaults(uid: string): TechnicianDoc {
  const area = AREAS[0];
  return {
    id: uid,
    name: uid === DEFAULT_TECHNICIAN_ID ? "Rafiq Ahmad" : uid,
    workPhotos: [],
    trades: [],
    yearsExperience: 0,
    center: { lat: area.lat, lng: area.lng, areaId: area.id },
    radiusKm: 6,
    isOnline: false,
    lastActiveAt: 0,
    approvalStatus: "pending",
    badges: [],
    stats: { jobsCompleted: 0, ratingSum: 0, ratingCount: 0, avgResponseSec: null, noShowCount: 0 },
  };
}

async function load(uid: string): Promise<TechnicianDoc> {
  const snap = await db.collection("technicians").doc(uid).get();
  return (snap.data() as TechnicianDoc | undefined) ?? defaults(uid);
}

export async function GET(request: Request) {
  try {
    const uid = await technicianIdFromRequest(request);
    return NextResponse.json(await load(uid));
  } catch {
    return NextResponse.json({ error: { code: "unavailable", message: "Technician service unavailable" } }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "Invalid input" } }, { status: 400 });
  }

  let uid: string;
  try {
    uid = await technicianIdFromRequest(request);
  } catch {
    return NextResponse.json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
  }

  const body = parsed.data;
  let center: GeoPoint | undefined;
  if (body.areaId !== undefined) {
    const area = AREAS.find((a) => a.id === body.areaId);
    if (!area) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Unknown area" } }, { status: 400 });
    }
    center = { lat: area.lat, lng: area.lng, areaId: area.id };
  }

  try {
    const existing = await load(uid);
    const now = Date.now();
    const idleMs = TECH_IDLE_OFFLINE_HOURS * 60 * 60 * 1000;
    const idle = now - (Number(existing.lastActiveAt) || 0) > idleMs;

    const coreChanged =
      (body.trades !== undefined && JSON.stringify(body.trades) !== JSON.stringify(existing.trades)) ||
      (center !== undefined && center.areaId !== existing.center?.areaId) ||
      (body.radiusKm !== undefined && body.radiusKm !== existing.radiusKm) ||
      (body.visitFeePKR !== undefined && body.visitFeePKR !== existing.visitFeePKR);

    const { areaId: _areaId, ...rest } = body;
    const update: Partial<TechnicianDoc> = {
      ...rest,
      ...(center ? { center } : {}),
      // Explicitly coming back online is allowed; otherwise 4h of silence forces offline.
      isOnline: body.isOnline ?? (idle ? false : existing.isOnline),
      lastActiveAt: now,
      ...(coreChanged ? { approvalStatus: "pending" as const } : {}),
    };
    const next = { ...defaults(uid), ...existing, ...update };

    await db.collection("technicians").doc(uid).set(next, { merge: true });
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: { code: "unavailable", message: "Technician service unavailable" } }, { status: 503 });
  }
}
