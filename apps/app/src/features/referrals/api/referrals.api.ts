import type { BedStatus } from "@workspace/types";
import { apiFetch } from "@/lib/api/api-client";

export interface HospitalBed {
  id: string;
  ward: string;
  roomNumber: string;
  bedNumber: string;
  /**
   * Typed as the canonical `BedStatusEnum` rather than `string`: the bed grid
   * compares and colors on this value, and a loose string let a misspelled
   * status render as the neutral fallback.
   */
  status: BedStatus;
  patientName?: string;
}

/**
 * `GET /ipd/wards` is the only endpoint that exposes beds; there is no
 * `/hospital/beds` route. It returns wards nested under rooms, so the grid
 * flattens one level.
 */
interface WardWithBeds {
  name: string;
  rooms: Array<{
    roomNumber: string;
    beds: Array<{
      id: string;
      bedNumber: string;
      status: BedStatus;
    }>;
  }>;
}

export async function getHospitalBeds(): Promise<HospitalBed[]> {
  const wards = await apiFetch<WardWithBeds[]>("/ipd/wards");
  return wards.flatMap((ward) =>
    ward.rooms.flatMap((room) =>
      room.beds.map((bed) => ({
        id: bed.id,
        ward: ward.name,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        status: bed.status,
      })),
    ),
  );
}
