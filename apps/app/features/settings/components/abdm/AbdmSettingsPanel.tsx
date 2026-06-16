"use client";

import { Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { ComingSoonBadge } from "@/components/feedback/coming-soon-badge";

/**
 * ABDM integration is under active development. The settings panel shows a
 * preview of what's coming rather than live controls until the gateway
 * certification flow is complete.
 */
export function AbdmSettingsPanel() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ABDM Integration
            <ComingSoonBadge />
          </CardTitle>
          <CardDescription>
            ABHA verification, M2 linking, M3 consent, and DHIS reporting are
            coming soon. Gateway certification is in progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              The ABDM settings panel will include:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Facility ABDM enable/disable toggle</li>
              <li>M1/M2/M3 readiness checklist</li>
              <li>ABHA verification status per patient</li>
              <li>External health records inbox</li>
              <li>DHIS incentive estimates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
