import { useMemo, useState } from "react";
import { useAPIQuery } from "@/lib/api-core";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { Bed as BedType, Room, Ward } from "@workspace/types";

export interface WardWithRooms extends Ward {
  rooms: (Room & { beds: BedType[] })[];
}

export const useIpdLogic = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: wards, isLoading } = useAPIQuery<WardWithRooms[]>(
    ["wards", debouncedSearch],
    `/ipd/wards${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""}`,
  );

  const normalizedWards = useMemo(() => {
    if (!wards) return undefined;
    return wards.map((ward) => ({
      ...ward,
      rooms: (ward.rooms || []).map((room) => ({
        ...room,
        beds: (room.beds || []).map((b) => ({
          ...b,
          status: typeof b.status === "string" ? b.status.toUpperCase() : b.status,
        })),
      })),
    }));
  }, [wards]);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const stats = useMemo(() => {
    if (!normalizedWards)
      return {
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        occupancyRate: 0,
      };

    const totalBeds = normalizedWards.reduce(
      (acc, ward) =>
        acc + (ward.rooms?.reduce((rAcc, room) => rAcc + (room.beds?.length || 0), 0) || 0),
      0,
    );

    const occupiedBeds = normalizedWards.reduce((acc, ward) => {
      const wardOccupied =
        (ward.rooms?.reduce((rAcc, room) =>
          rAcc +
          room.beds.filter((b) => String(b.status).toUpperCase() === "OCCUPIED").length,
        0) || 0);

      return acc + wardOccupied;
    }, 0);

    const availableBeds = totalBeds - occupiedBeds;
    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
    };
  }, [normalizedWards]);

  return {
    wards: normalizedWards,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    showAdmissionModal,
    setShowAdmissionModal,
  };
};
