"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Feature } from "@workspace/types";
import { api } from "@/lib/api/api-client";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { logger } from "@/lib/monitoring/logger";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  type FollowUp,
  isExpectedAccessFailure,
  logPayloadFromError,
  parseFollowUpList,
} from "./follow-up-helpers";

export function useFollowUps(appointmentId?: string) {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!calendarOk) {
      setFollowUps([]);
      setLoading(false);
      setLoadError(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.get<unknown>("/follow-ups", {
        params: appointmentId ? { appointmentId } : undefined,
      });
      setFollowUps(parseFollowUpList(data));
    } catch (err) {
      if (isExpectedAccessFailure(err)) {
        setFollowUps([]);
        return;
      }
      logger.error("Failed to load follow-ups", logPayloadFromError(err));
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, calendarOk]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = async (id: string) => {
    if (!calendarOk) return;
    setActioning(id);
    try {
      await api.patch(`/follow-ups/${id}/complete`, {});
      setFollowUps((prev) => prev.filter((fu) => fu.id !== id));
      toast.success("Follow-up marked complete");
    } catch (err) {
      logger.error("Failed to complete follow-up", logPayloadFromError(err));
      showUserFacingErrorToast(
        "We could not complete this follow-up. Please try again.",
      );
    } finally {
      setActioning(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!calendarOk) return;
    setActioning(id);
    try {
      await api.patch(`/follow-ups/${id}/cancel`, {});
      setFollowUps((prev) => prev.filter((fu) => fu.id !== id));
      toast.success("Follow-up cancelled");
    } catch (err) {
      logger.error("Failed to cancel follow-up", logPayloadFromError(err));
      showUserFacingErrorToast(
        "We could not cancel this follow-up. Please try again.",
      );
    } finally {
      setActioning(null);
    }
  };

  return {
    followUps,
    loading,
    loadError,
    actioning,
    handleComplete,
    handleCancel,
  };
}
