import { useMemo, useState } from "react";
import { useAPIQuery } from "@/lib/api-core";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { Bed as BedType, Room, Ward } from "@workspace/types";

// Type definitions matching existing data structure
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
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const stats = useMemo(() => {
    if (!wards)
      return {
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        occupancyRate: 0,
      };

    const totalBeds = wards.reduce(
      (acc, ward) =>
        acc +
        (ward.rooms?.reduce((rAcc, room) => rAcc + room.beds.length, 0) || 0),
      0,
    );

    const occupiedBeds = wards.reduce(
      (acc, ward) =>
        acc +
        (ward.rooms?.reduce(
          (rAcc, room) =>
            rAcc + room.beds.filter((b) => b.status === "OCCUPIED").length,
          0,
        ) || 0),
      0,
    );

    const availableBeds = totalBeds - occupiedBeds;
    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
    };
  }, [wards]);

  return {
    wards,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    showAdmissionModal,
    setShowAdmissionModal,
  };
};
