import { useCallback, useMemo, useState } from "react";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appQueryKeys } from "@/lib/api/query-keys";
import {
  type Admission,
  type AdmitPatientRequest,
  type DischargePatientRequest,
  Feature,
  type TransferPatientRequest,
} from "@workspace/types";
import { ipdApi } from "../api/ipd.api";
import {
  computeIpdStats,
  type WardWithRooms,
} from "../lib/ipd-stats-helpers";

export type { WardWithRooms } from "../lib/ipd-stats-helpers";

export const useIpdLogic = () => {
  const ipdOk = useTierFeatureEnabled(Feature.FULL_EHR);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const {
    data: wards,
    isLoading,
    isError,
    refetch: refetchWards,
  } = useQuery<WardWithRooms[]>({
    queryKey: [...appQueryKeys.ipd.wards, debouncedSearch],
    queryFn: () => ipdApi.getWards(debouncedSearch),
    staleTime: 15 * 1000,
    enabled: ipdOk,
  });

  const { data: activeAdmissions } = useQuery<Admission[]>({
    queryKey: appQueryKeys.ipd.activeAdmissions,
    queryFn: ipdApi.getActiveAdmissions,
    staleTime: 15 * 1000,
    enabled: ipdOk,
  });

  const invalidateIpdQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: appQueryKeys.ipd.wards });
    queryClient.invalidateQueries({ queryKey: appQueryKeys.ipd.activeAdmissions });
  }, [queryClient]);

  const admitPatientMutation = useMutation<Admission, Error, AdmitPatientRequest>({
    mutationFn: ipdApi.admitPatient,
    onSuccess: invalidateIpdQueries,
  });

  const transferPatientMutation = useMutation<Admission, Error, TransferPatientRequest>({
    mutationFn: ipdApi.transferPatient,
    onSuccess: invalidateIpdQueries,
  });

  const dischargePatientMutation = useMutation<Admission, Error, DischargePatientRequest>({
    mutationFn: ipdApi.dischargePatient,
    onSuccess: invalidateIpdQueries,
  });

  const normalizedWards = useMemo(() => {
    if (!wards) return undefined;
    return wards.map((ward) => ({
      ...ward,
      rooms: (ward.rooms || []).map((room) => ({
        ...room,
        beds: (room.beds || []).map((b) => ({
          ...b,
          status:
            typeof b.status === "string" ? b.status.toUpperCase() : b.status,
        })),
      })),
    }));
  }, [wards]);

  const stats = useMemo(
    () => computeIpdStats(normalizedWards, activeAdmissions?.length),
    [activeAdmissions?.length, normalizedWards],
  );

  return {
    wards: normalizedWards,
    isLoading,
    isError,
    refetch: refetchWards,
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
