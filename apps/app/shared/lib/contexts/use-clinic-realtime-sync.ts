import { type Dispatch, type SetStateAction } from "react";
import { useClinicSocket } from "@/hooks/use-clinic-socket";
import { tierSchema } from "@workspace/types";
import type { Clinic } from "./clinic-context-types";

/**
 * Applies real-time clinic-socket events to the cached clinic record: a
 * tier/add-on/subscription change triggers a full authoritative refetch, and
 * — independently — patches the cached record in place so the UI reflects the
 * new tier/add-on/subscription fields immediately, without waiting on it.
 */
export function useClinicRealtimeSync(params: {
  clinicId: string | null;
  setClinicState: Dispatch<SetStateAction<Clinic | null>>;
  updatePermissionsFromClinic: (clinicData: Clinic) => void;
  fetchClinicFromAPI: (force?: boolean) => Promise<void>;
}) {
  const { clinicId, setClinicState, updatePermissionsFromClinic, fetchClinicFromAPI } = params;

  useClinicSocket(clinicId, (data) => {
    if (data.clinicId !== clinicId) return;

    if (
      data.tier ||
      data.intelligenceAddon ||
      data.subscriptionStatus ||
      data.subscriptionGraceUntil !== undefined
    ) {
      void fetchClinicFromAPI(true);
    }

    if (data.tier) {
      const parsedTier = tierSchema.safeParse(data.tier);
      if (parsedTier.success) {
        setClinicState((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, tier: parsedTier.data };
          updatePermissionsFromClinic(updated);
          return updated;
        });
      }
    }

    if (data.intelligenceAddon) {
      setClinicState((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          intelligenceAddon: data.intelligenceAddon ?? prev.intelligenceAddon,
        };
        updatePermissionsFromClinic(updated);
        return updated;
      });
    }

    if (data.subscriptionStatus) {
      const subscriptionStatus = data.subscriptionStatus;
      setClinicState((prev) => (prev ? { ...prev, subscriptionStatus } : prev));
    }

    if (data.subscriptionGraceUntil !== undefined) {
      setClinicState((prev) =>
        prev ? { ...prev, subscriptionGraceUntil: data.subscriptionGraceUntil } : prev,
      );
    }
  });
}
