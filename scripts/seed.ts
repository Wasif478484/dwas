// DWAS build specification v1.0 — section 11 (seed data).
// Wipes the demo collections and writes: the 7 areas (11.2), the rate table
// (11.3), 24 technicians, 3 demo clients, ~60 past bookings and reviews, and
// one admin. Technician aggregates (jobsCompleted, ratingSum/ratingCount,
// avgResponseSec, noShowCount) are computed from the seeded bookings/reviews
// per 7.3. Everything is marked isSeed. See DECISIONS.md for notes on the
// placeholder rate values and the Urdu strings (TODO-REVIEW).

import { Timestamp } from "firebase-admin/firestore";
import { db } from "../src/lib/firebase/admin";
import { AREAS } from "../src/lib/areas";
import type { RateTableRow } from "../src/lib/rate-table";
import type { BookingDoc, ReviewDoc, Role, TechnicianDoc, Trade } from "../src/lib/types";

// Deterministic pseudo-random source: re-seeds produce the same demo data.
let state = 20261116;
function rnd(min = 0, max = 1): number {
  state = (state * 1664525 + 1013904223 + min * 7) >>> 0;
  return min + ((state / 2 ** 32) % (max - min));
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rnd() * items.length)];
}
function ts(date: Date) {
  return Timestamp.fromDate(date);
}

// 11.2 Areas (shared with the client, C05) — imported at the top.

// 11.3 Rate table (placeholder values — re-ask real technicians per README).
const RATE_TABLE: RateTableRow[] = [
  { trade: "plumber", jobType: "tap_leak", minPKR: 500, maxPKR: 1500 },
  { trade: "plumber", jobType: "drain_block", minPKR: 800, maxPKR: 2500 },
  { trade: "plumber", jobType: "geyser_issue", minPKR: 1000, maxPKR: 4000 },
  { trade: "plumber", jobType: "tank_pump", minPKR: 1000, maxPKR: 3500 },
  { trade: "plumber", jobType: "pipe_burst", minPKR: 1500, maxPKR: 5000 },
  { trade: "electrician", jobType: "switch_socket", minPKR: 300, maxPKR: 1000 },
  { trade: "electrician", jobType: "wiring_fault", minPKR: 1000, maxPKR: 4000 },
  { trade: "electrician", jobType: "fan", minPKR: 400, maxPKR: 1500 },
  { trade: "electrician", jobType: "ups_inverter", minPKR: 1000, maxPKR: 4000 },
  { trade: "electrician", jobType: "short_circuit", minPKR: 800, maxPKR: 3000 },
  { trade: "ac_fridge", jobType: "ac_not_cooling", minPKR: 1500, maxPKR: 4500 },
  { trade: "ac_fridge", jobType: "ac_gas", minPKR: 3000, maxPKR: 7000 },
  { trade: "ac_fridge", jobType: "ac_install", minPKR: 3500, maxPKR: 8000 },
  { trade: "ac_fridge", jobType: "fridge_not_cooling", minPKR: 1500, maxPKR: 5000 },
  { trade: "carpenter", jobType: "door_lock", minPKR: 500, maxPKR: 2000 },
  { trade: "carpenter", jobType: "door_repair", minPKR: 800, maxPKR: 3000 },
  { trade: "carpenter", jobType: "furniture_repair", minPKR: 1000, maxPKR: 4000 },
  { trade: "carpenter", jobType: "cupboard", minPKR: 1500, maxPKR: 6000 },
  { trade: "mazdoor", jobType: "day_labour", minPKR: 1500, maxPKR: 2500 },
  { trade: "mazdoor", jobType: "shifting_help", minPKR: 2000, maxPKR: 6000 },
  { trade: "mazdoor", jobType: "cleaning_help", minPKR: 1500, maxPKR: 3000 },
];

// 11.1: 24 technicians — 6 plumbers, 6 electricians, 5 AC and fridge, 4 carpenters, 3 mazdoor.
const TECH_NAMES = [
  "Rafiq Ahmad", "Mira Nadeem", "Hassan Alvi", "Zainab Rizvi", "Zubair Rana", "Sara Khan",
  "Iqbal Nadeem", "Nosheen Akhtar", "Faisal Chaudhry", "Tooba Rizvi", "Mehboob Rana",
  "Summaiya Khan", "Suleman Akhtar", "Amna Nadeem", "Salman Khan", "Zeba Rana",
  "Shahrukh Alvi", "Taimoor Nadeem", "Anam Rizvi", "Zainab Khan", "Junaid Akhtar",
  "Mehak Rana", "Talha Nadeem", "Haris Khan",
];
const TRADE_GROUPS: Array<{ trade: Trade; count: number }> = [
  { trade: "plumber", count: 6 },
  { trade: "electrician", count: 6 },
  { trade: "ac_fridge", count: 5 },
  { trade: "carpenter", count: 4 },
  { trade: "mazdoor", count: 3 },
];
const BIO_TEMPLATE = "[TODO-REVIEW] {name} se koi bhi mushkil mushkil se khilna banta hai.";
const NEWCOMERS = ["Rafiq Ahmad", "Suleman Akhtar", "Taimoor Nadeem"]; // 11.1: 3 newcomers (under 5 jobs)
const OFFLINE = ["Mehak Rana", "Salman Khan"]; // 11.1: 2 offline
const SUSPENDED = ["Iqbal Nadeem"]; // 11.1: 1 suspended
const PENDING = ["Mira Nadeem"]; // 11.1: 1 pending approval (S4, admin demo)

const START = new Date(2026, 9, 1); // history window opens 1 Oct 2026

function tocSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

async function wipe() {
  const collections = ["users", "technicians", "bookings", "reviews", "rateTable", "areas", "complaints", "events", "audit"];
  for (const name of collections) {
    const snap = await db.collection(name).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

function randSec(min: number, max: number): number {
  return Math.floor(rnd(min, max));
}

function main() {
  const techs: TechnicianDoc[] = [];
  const techByName = new Map<string, TechnicianDoc>();
  let nameIndex = 0;
  for (const group of TRADE_GROUPS) {
    for (let i = 0; i < group.count; i += 1) {
      const name = TECH_NAMES[nameIndex];
      nameIndex += 1;
      const area = pick(AREAS);
      const isNewcomer = NEWCOMERS.includes(name);
      const isOffline = OFFLINE.includes(name);
      const isSuspended = SUSPENDED.includes(name);
      const isPending = PENDING.includes(name) && group.trade === "electrician";
      const tech: TechnicianDoc = {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        trades: [group.trade],
        yearsExperience: rnd(1, 22),
        bio_ur: BIO_TEMPLATE.replace("{name}", name),
        center: { lat: area.lat + rnd(-0.02, 0.02), lng: area.lng + rnd(-0.02, 0.02), areaId: area.id },
        radiusKm: rnd(2, 10),
        isOnline: isOffline ? false : isSuspended ? false : isNewcomer ? false : true,
        lastActiveAt: tocSeconds(new Date(Date.now() - randSec(0, 3 * 24 * 3600))),
        approvalStatus: isPending ? "pending" : isSuspended ? "suspended" : "approved",
        badges: isSuspended ? [] : isPending ? [] : ["admin_approved"],
        stats: { jobsCompleted: 0, ratingSum: 0, ratingCount: 0, avgResponseSec: null, noShowCount: 0 },
        workPhotos: [],
        isSeed: true,
      };
      techs.push(tech);
      techByName.set(name, tech);
    }
  }
  // Demo clients per 11.1 + the 2 extra clients asked for here (3 demo clients).
  const clients = ["Ayesha Khan", "Farah Rizvi", "Tauseef Ali"];
  const bookings: BookingDoc[] = [];
  const reviews: ReviewDoc[] = [];
  const STATUS_WEIGHTS = ["completed", "completed", "completed", "accepted", "requested", "declined", "expired", "cancelled_client", "no_show"] as const;

  for (let i = 1; i <= 60; i += 1) {
    const tech = pick(techs);
    const clientId = clients[0];
    const area = pick(AREAS);
    const status = pick(STATUS_WEIGHTS);
    const t0 = new Date(START.getTime() + randSec(0, 45 * 24 * 3600) * 1000);
    const createdAt = ts(new Date(t0.getTime() - randSec(0, 5 * 86400) * 1000));
    const history: BookingDoc["statusHistory"] = [{ status: "requested", at: createdAt.toDate().getTime(), actor: "client" }];
    const isCompleted = status === "completed";
    if (isCompleted) {
      const at = createdAt.toDate().getTime() + randSec(600, 43200) * 1000;
      history.push({ status: "accepted", at, actor: "technician" });
      const doneAt = at + randSec(7200, 432000) * 1000;
      history.push({ status: "completed", at: doneAt, actor: "technician" });
    } else if (status === "accepted") {
      history.push({ status: "accepted", at: createdAt.toDate().getTime() + randSec(600, 43200) * 1000, actor: "technician" });
    }
    const row = pick(RATE_TABLE.filter((r) => r.trade === tech.trades[0]));
    const overBand = row.maxPKR * (1 + 0.3 * rnd());
    const finalPrice = isCompleted ? (rnd() < 0.3 ? overBand : row.minPKR + Math.floor(rnd() * (row.maxPKR - row.minPKR + 1))) : undefined;
    const booking: BookingDoc = {
      id: `demo-b${String(i).padStart(2, "0")}`,
      clientId,
      technicianId: tech.id,
      trade: tech.trades[0],
      jobType: row.jobType,
      problemRaw: `Demo booking ${i} for ${tech.trades[0]}`,
      summary_en: `Demo problem ${i} in ${area.name}`,
      summary_ur: `[TODO-REVIEW] Demo masla ${i}`,
      urgency: pick(["now", "today", "tomorrow", "flexible"]),
      location: { lat: area.lat + rnd(-0.02, 0.02), lng: area.lng + rnd(-0.02, 0.02), areaId: area.id },
      priceBand: { min: row.minPKR, max: row.maxPKR },
      finalPrice,
      status,
      statusHistory: history,
      candidates: status === "requested" ? techs.slice(0, 5).map((t) => t.id) : [],
      attempts: [],
      expiresAt: createdAt.toDate().getTime() + 300 * 1000,
      photoUrls: [],
      phoneRevealed: !["requested", "declined", "expired", "cancelled_client", "no_show"].includes(status),
      shareToken: `tok-${i}`,
      createdAt: createdAt.toDate().getTime(),
    };
    bookings.push(booking);
    if (isCompleted) {
      const completed = history[history.length - 1];
      const review: ReviewDoc = {
        bookingId: booking.id,
        clientId: booking.clientId,
        technicianId: booking.technicianId,
        stars: rnd(3, 5) as 1 | 2 | 3 | 4 | 5,
        tags: pick([["on time"], ["clean work"], ["fair price"], ["on time", "clean work"]]),
        comment: rnd() < 0.7 ? `[TODO-REVIEW] Demire kaam achha laga.` : undefined,
        hidden: false,
        createdAt: completed.at + randSec(0, 172800),
      };
      reviews.push(review);
    }
  }

  // Aggregates (7.3): computed from the seeded bookings and reviews.
  const userId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const users = [
    { id: "ayesha-khan", role: "client" as const, name: clients[0], language: "en" },
    { id: userId(clients[1]), role: "client" as const, name: clients[1], language: "en" },
    { id: userId(clients[2]), role: "client" as const, name: clients[2], language: "en" },
    { id: "admin-user-1", role: "admin" as const, name: "Admin Demo", language: "en" },
    { id: "rafiq-ahmad", role: "technician" as const, name: "Rafiq Ahmad", language: "en" },
    { id: userId(techs[0].name), role: "technician" as const, name: techs[0].name, language: "en" },
  ];
  const usersWrites = users.map((u) => ({
    id: u.id,
    role: u.role,
    name: u.name,
    language: u.language,
    createdAt: tocSeconds(new Date()),
    isSeed: true,
  }));

  for (const tech of techs) {
    const mine = bookings.filter((b) => b.technicianId === tech.id);
    const techReviews = reviews.filter((r) => mine.some((b) => b.id === r.bookingId));
    const responseSecs: number[] = [];
    for (const b of mine) {
      const requested = b.statusHistory[0];
      const accepted = b.statusHistory.find((h) => h.status === "accepted");
      if (accepted && accepted.at > requested.at) responseSecs.push((accepted.at - requested.at) / 1000);
    }
    tech.stats = {
      jobsCompleted: mine.filter((b) => b.status === "completed").length,
      ratingSum: techReviews.reduce((sum, r) => sum + r.stars, 0),
      ratingCount: techReviews.length,
      avgResponseSec: responseSecs.length > 0 ? Math.round(responseSecs.reduce((a, b) => a + b, 0) / responseSecs.length) : null,
      noShowCount: mine.filter((b) => b.status === "no_show").length,
    };
  }

  return { areas: AREAS, rateTable: RATE_TABLE, users: usersWrites, technicians: techs, bookings, reviews };
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) out[key] = val;
  }
  return out as Partial<T>;
}

function dump(data: Awaited<ReturnType<typeof main>>) {
  const counts = Object.fromEntries(["areas", "rateTable", "users", "technicians", "bookings", "reviews"].map((k) => [k, data[k as keyof typeof data].length]));
  console.log("Seeded collections:", JSON.stringify(counts));
}

async function mainAsync() {
  await wipe();
  const data = main();
  const batch = db.batch();
  for (const area of data.areas) batch.set(db.collection("areas").doc(area.id), { ...area, isSeed: true });
  for (const row of data.rateTable) batch.set(db.collection("rateTable").doc(`${row.trade}__${row.jobType}`), { ...row });
  for (const u of data.users) batch.set(db.collection("users").doc(u.id), u);
  for (const t of data.technicians) batch.set(db.collection("technicians").doc(t.id), t);
  for (const b of data.bookings) batch.set(db.collection("bookings").doc(b.id), stripUndefined(b));
  for (const r of data.reviews) batch.set(db.collection("reviews").doc(r.bookingId), stripUndefined(r));
  await batch.commit();
  dump(data);
}

mainAsync().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
