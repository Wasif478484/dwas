// C08: turn the client's stored intake/location into a POST /api/bookings body.
import type { LocationData } from "@/components/LocationScreen";
import { AREAS } from "@/lib/areas";
import type { IntakeResult } from "@/lib/types";

export interface BookingCreatePayload {
  technicianId: string;
  quick: false;
  intake: IntakeResult;
  location: { areaId?: string; lat?: number; lng?: number };
  note: string;
  photoUrls: string[];
}

export function bookingPrefill(
  intake: IntakeResult | null,
  location: LocationData | null,
  technicianId: string | null,
): BookingCreatePayload | null {
  if (!intake || !technicianId || typeof intake.jobType !== "string" || !intake.jobType) return null;

  const spot: BookingCreatePayload["location"] = {};
  if (location?.areaId) spot.areaId = location.areaId;
  if (typeof location?.lat === "number") spot.lat = location.lat;
  if (typeof location?.lng === "number") spot.lng = location.lng;
  // Spec C05: when geolocation was denied, the seeded area supplies rounded
  // coordinates so the API still receives a usable location.
  if (typeof spot.lat !== "number" || typeof spot.lng !== "number") {
    const area = AREAS.find((a) => a.id === location?.areaId);
    if (area) {
      spot.lat = area.lat;
      spot.lng = area.lng;
      spot.areaId = area.id;
    }
  }

  return { technicianId, quick: false, intake, location: spot, note: "", photoUrls: [] };
}
