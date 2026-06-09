"use client";

import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

interface TenantScopeCoverageProps {
  uncoveredCount: number;
  staleCount: number;
  excludedCount: number;
  excludedModels: string[];
}

export function TenantScopeCoverage({ uncoveredCount, staleCount, excludedCount, excludedModels }: TenantScopeCoverageProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Coverage Status</CardTitle>
          <CardDescription>
            Open tenant-scope findings from the generated datamodel
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <span className="text-sm font-medium">Uncovered</span>
            <Badge
              variant={uncoveredCount ? "destructive" : "secondary"}
            >
              {uncoveredCount}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <span className="text-sm font-medium">Stale rules</span>
            <Badge
              variant={staleCount ? "destructive" : "secondary"}
            >
              {staleCount}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <span className="text-sm font-medium">Excluded</span>
            <Badge variant="outline">{excludedCount}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exceptions</CardTitle>
          <CardDescription>
            ClinicId models intentionally outside auto-scoping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {excludedModels.map((model) => (
              <Badge key={model} variant="outline">
                {model}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
