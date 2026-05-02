"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Calendar, Check, X } from "lucide-react";
import { APIRequestError } from "@workspace/data-access";
import { api } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatDate } from "@/lib/formatters";

interface FollowUp {
  id: string;
  scheduledDate: string;
  reason: string;
  status: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  doctor: {
    id: string;
    name: string;
  };
}

function isExpectedAccessFailure(err: unknown): boolean {
  if (!(err instanceof APIRequestError)) return false;
  const status = err.status;
  return status === 401 || status === 403 || status === 404;
}

function logPayloadFromError(err: unknown): Record<string, unknown> {
  if (err instanceof APIRequestError) {
    return {
      name: err.name,
      message: err.message,
      status: err.status,
      code: err.code,
    };
  }
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { detail: String(err) };
}

interface FollowUpWidgetProps {
  /** When set, loads follow-ups for this appointment only (consultation sidebar). */
  appointmentId?: string;
}

export function FollowUpWidget({ appointmentId }: FollowUpWidgetProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.get<unknown>("/follow-ups", {
        params: appointmentId ? { appointmentId } : undefined,
      });
      setFollowUps(Array.isArray(data) ? (data as FollowUp[]) : []);
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
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = async (id: string) => {
    setActioning(id);
    try {
      await api.patch(`/follow-ups/${id}/complete`, {});
      setFollowUps((prev) => prev.filter((fu) => fu.id !== id));
      toast.success("Follow-up marked as completed");
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

  if (loading || (!loadError && followUps.length === 0)) return null;
  if (loadError) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Pending Follow-ups ({followUps.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {followUps.slice(0, 5).map((fu) => (
          <div
            key={fu.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div>
              <p className="text-sm font-medium">
                {fu.patient.firstName} {fu.patient.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{fu.reason}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(fu.scheduledDate)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {humanizeUiLabel(fu.status)}
              </Badge>
              <SymbolTooltip label="Mark as completed">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-success hover:bg-success/10"
                  disabled={actioning === fu.id}
                  onClick={() => handleComplete(fu.id)}
                  aria-label="Mark as completed"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </SymbolTooltip>
              <SymbolTooltip label="Cancel follow-up">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={actioning === fu.id}
                  onClick={() => handleCancel(fu.id)}
                  aria-label="Cancel follow-up"
                >
                  <X className="h-3 w-3" />
                </Button>
              </SymbolTooltip>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
