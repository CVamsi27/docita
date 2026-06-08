"use client";

import { getPatientFullName } from "@workspace/utils";

// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Calendar, Check, X } from "lucide-react";
// jscpd:ignore-end
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatDate } from "@/lib/formatters";
import { useFollowUps } from "./use-follow-ups";

interface FollowUpWidgetProps {
  /** When set, loads follow-ups for this appointment only (consultation sidebar). */
  appointmentId?: string;
}

export function FollowUpWidget({ appointmentId }: FollowUpWidgetProps) {
  const { followUps, loading, loadError, actioning, handleComplete, handleCancel } =
    useFollowUps(appointmentId);

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
                {getPatientFullName(fu.patient)}
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
              <SymbolTooltip label="Mark complete">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-success hover:bg-success/10"
                  disabled={actioning === fu.id}
                  onClick={() => handleComplete(fu.id)}
                  aria-label="Mark complete"
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
