import type { Bed, Room, Ward } from "@workspace/types";

export interface WardWithRooms extends Ward {
  rooms: (Room & { beds: Bed[] })[];
}

export function countBedsByStatus(
  wards: WardWithRooms[] | undefined,
  status: string,
): number {
  if (!wards) return 0;

  const normalized = status.toUpperCase();
  return wards.reduce((acc, ward) => {
    const wardCount =
      ward.rooms?.reduce((roomAcc, room) => {
        const beds = Array.isArray(room.beds) ? room.beds : [];
        return (
          roomAcc +
          beds.filter((b) => String(b.status).toUpperCase() === normalized)
            .length
        );
      }, 0) ?? 0;

    return acc + wardCount;
  }, 0);
}

export function countTotalBeds(wards: WardWithRooms[] | undefined): number {
  if (!wards) return 0;

  return wards.reduce((acc, ward) => {
    const wardCount =
      ward.rooms?.reduce((roomAcc, room) => {
        const beds = Array.isArray(room.beds) ? room.beds : [];
        return roomAcc + beds.length;
      }, 0) ?? 0;

    return acc + wardCount;
  }, 0);
}

export interface IpdStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
  activeAdmissions: number;
}

export function computeIpdStats(
  wards: WardWithRooms[] | undefined,
  activeAdmissionsCount: number | undefined,
): IpdStats {
  const totalBeds = countTotalBeds(wards);
  const occupiedBeds = countBedsByStatus(wards, "OCCUPIED");
  const maintenanceBeds = countBedsByStatus(wards, "MAINTENANCE");
  const availableBeds = totalBeds - occupiedBeds;
  const occupancyRate =
    totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // `??` (not `||`): an explicitly empty admissions list is a real zero,
  // while undefined admissions (query error/disabled) approximate with beds.
  const activeAdmissions =
    activeAdmissionsCount ?? occupiedBeds;

  return {
    totalBeds,
    occupiedBeds,
    availableBeds,
    maintenanceBeds,
    occupancyRate,
    activeAdmissions,
  };
}
