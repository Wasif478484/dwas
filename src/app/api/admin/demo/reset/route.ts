// A07: demo reset. The guard is live, but the wipe + re-seed itself is a later
// milestone, so the endpoint deliberately reports 501 for now.
import { NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    if (process.env.DEMO_MODE_ENABLED !== "true") {
      return NextResponse.json(
        { error: { code: "demo_mode_disabled", message: "Demo mode is disabled" } },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: { code: "not_implemented", message: "Demo reset (A07) is not implemented yet" } },
      { status: 501 },
    );
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
