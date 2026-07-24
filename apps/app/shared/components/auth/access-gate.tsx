"use client";

// jscpd:ignore-start
import type React from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { APP_ACCESS_MATRIX, type AppAccessTarget } from "@workspace/types";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

interface AccessGateProps {
// jscpd:ignore-end
  target: AppAccessTarget;
  mode?: "read" | "write";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
  hideWhenDenied?: boolean;
}

export function AccessGate({
  target,
  mode = "read",
  children,
  fallback,
  title,
  description,
  hideWhenDenied = false,
}: AccessGateProps) {
  const { user } = useAuth();
  const { canAccess, currentTier, hasIntelligence } = usePermissionStore();

  const allowed = canAccessTarget(
    target,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      hasIntelligence,
    },
    mode,
  );

  if (allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  if (hideWhenDenied) return null;

  const policy = APP_ACCESS_MATRIX[target];
  const resolvedTitle = title ?? "Access restricted";
  const resolvedDescription =
    description ??
    (policy
      ? "This area is unavailable on your current plan or role."
      : "You do not have access to this area.");

  return (
    <Card className="surface-warning border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning">
          <Lock className="size-5" aria-hidden />
          {resolvedTitle}
        </CardTitle>
        <CardDescription className="text-warning/80">
          {resolvedDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" className="gap-2">
          <Link href={SUBSCRIPTION_SETTINGS_PATH}>
            <Sparkles className="size-4" aria-hidden />
            Upgrade plan
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
