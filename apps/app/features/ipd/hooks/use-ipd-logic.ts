"use client";

import { useMemo, useState } from "react";
import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  type Admission,
  type AdmitPatientRequest,
  type Bed as BedType,
  type DischargePatientRequest,
  Feature,
  type Room,
  type TransferPatientRequest,
  type Ward,
} from "@workspace/types";

export interface WardWithRooms extends Ward {
  rooms: (Room & { beds: BedType[] })[];
}

export const useIpdLogic = () => {
  const ipdOk = useTierFeatureEnabled(Feature.FULL_EHR);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const { data: wards, isLoading } = useAPIQuery<WardWithRooms[]>(
    ["ipd", "wards", debouncedSearch],
    `/ipd/wards${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""}`,
    { staleTime: 15 * 1000, enabled: ipdOk },
  );

  const { data: activeAdmissions } = useAPIQuery<Admission[]>(
    ["ipd", "admissions", "active"],
    "/ipd/admissions?status=ADMITTED",
    { staleTime: 15 * 1000, enabled: ipdOk },
  );

  const admitPatientMutation = useAPIMutation<Admission, AdmitPatientRequest>(
    "/ipd/admissions",
    "POST",
    {
      invalidateKeys: [
        ["ipd", "wards"],
        ["ipd", "admissions", "active"],
      ],
    },
  );

  const transferPatientMutation = useAPIMutation<
    Admission,
    TransferPatientRequest
  >("/ipd/transfers", "POST", {
    invalidateKeys: [
      ["ipd", "wards"],
      ["ipd", "admissions", "active"],
    ],
  });

  const dischargePatientMutation = useAPIMutation<
    Admission,
    DischargePatientRequest
  >("/ipd/discharges", "POST", {
    invalidateKeys: [
      ["ipd", "wards"],
      ["ipd", "admissions", "active"],
    ],
  });

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
  const stats = useMemo(() => {
    if (!normalizedWards)
      return {
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        maintenanceBeds: 0,
        occupancyRate: 0,
        activeAdmissions: activeAdmissions?.length ?? 0,
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
    const maintenanceBeds = normalizedWards.reduce((acc, ward) => {
      const wardMaintenance =
        (ward.rooms?.reduce(
          (rAcc, room) =>
            rAcc +
            room.beds.filter(
              (b) => String(b.status).toUpperCase() === "MAINTENANCE",
            ).length,
          0,
        ) || 0);

      return acc + wardMaintenance;
    }, 0);
    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyRate,
      activeAdmissions: activeAdmissions?.length ?? occupiedBeds,
    };
  }, [activeAdmissions?.length, normalizedWards]);

  return {
    wards: normalizedWards,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    showAdmissionModal,
    setShowAdmissionModal,
    admitPatient: admitPatientMutation.mutateAsync,
    transferPatient: transferPatientMutation.mutateAsync,
    dischargePatient: dischargePatientMutation.mutateAsync,
    isAdmitting: admitPatientMutation.isPending,
    isTransferring: transferPatientMutation.isPending,
    isDischarging: dischargePatientMutation.isPending,
  };
};
