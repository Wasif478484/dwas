// C15: the signed-in client's past bookings, newest first (max 50).
import { NextResponse } from "next/server";
import { fail, getActor, handleError } from "@/app/api/bookings/route";
import { db } from "@/lib/firebase/admin";
import type { BookingDoc } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { uid, role } = await getActor(request);
    if (role !== "client") return fail("forbidden", "Clients only", 403);

    const snap = await db
      .collection("bookings")
      .where("clientId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const bookings = snap.docs.map((doc) => doc.data() as BookingDoc);

    const techIds = [...new Set(bookings.map((b) => b.technicianId).filter(Boolean))];
    const techSnaps = techIds.length
      ? await db.getAll(...techIds.map((id) => db.collection("technicians").doc(id)))
      : [];
    const names = new Map(
      techSnaps.filter((s) => s.exists).map((s) => [s.id, (s.data() as { name?: string }).name] as const),
    );

    const items = bookings.map<BookingDoc & { technicianName?: string }>((booking) => {
      const location = { ...booking.location };
      // C12: the exact-address note is private until the technician is revealed.
      if (!booking.phoneRevealed) delete location.note;
      const technicianName = names.get(booking.technicianId);
      return { ...booking, location, ...(technicianName ? { technicianName } : {}) };
    });
    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}
