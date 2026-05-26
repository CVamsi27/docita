"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { parseWorkspaceProfile, WORKSPACE_PROFILE_LABEL } from "@workspace/types";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

interface WorkspaceModeCardProps {
  workspaceProfile?: string | null;
}

export function WorkspaceModeCard({ workspaceProfile }: WorkspaceModeCardProps) {
  const workspaceLabel = WORKSPACE_PROFILE_LABEL[parseWorkspaceProfile(workspaceProfile)];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[var(--fs-md)]">Workspace mode</CardTitle>
        <CardDescription>
          This is separate from your subscription tier (Starter, Essential, and
          so on). It controls which areas of Docita stay available to your team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium text-foreground">{workspaceLabel}</p>
        <p className="text-muted-foreground">
          Plan limits, invoices, and upgrades live under{" "}
          <Link
            href={SUBSCRIPTION_SETTINGS_PATH}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Billing and subscription
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
