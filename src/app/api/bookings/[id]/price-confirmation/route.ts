// C11: client accepts an over-band final price.
import { NextResponse } from "next/server";
import { z } from "zod";
import { isOverBand } from "@/lib/rate-table";
import { ApiError, assertParticipant, getActor, handleError, readBooking } from "../../route";

const schema = z.object({ confirmed: z.literal(true) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { uid, role } = await getActor(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError("invalid_input", 400, "Invalid confirmation input");

    const { ref, booking } = await readBooking(id);
    assertParticipant(booking, uid, role);
    if (booking.clientId !== uid) throw new ApiError("forbidden", 403, "Not the client on this booking");
    if (booking.status !== "completed" || !isOverBand(booking.priceBand, booking.finalPrice)) {
      throw new ApiError("invalid_state", 409, "No over-band price awaiting confirmation");
    }

    // Extra fields: BookingDoc is Appendix A and must stay exact.
    await ref.update({ overBandConfirmed: true, overBandConfirmedAt: Date.now() });
    // price_confirmed is not in EVENT_TYPES; skip the event rather than edit Appendix A.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
