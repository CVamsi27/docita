"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Button } from "@workspace/ui/components/form/button";
import { useClinic } from "@/lib/contexts/clinic-context";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { resolveSubscriptionLockNotice } from "./subscription-lock-notice-helpers";

export function SubscriptionLockNotice() {
  const { clinic } = useClinic();
  const router = useRouter();
  const copy = resolveSubscriptionLockNotice(clinic);
  if (!copy) return null;

  const useLockIcon = copy.kind === "expired" || copy.kind === "trial-grace";

  return (
    <div className="border-b bg-background px-4 py-3 md:px-6">
      <Alert variant={copy.variant} className={copy.toneClass}>
        {useLockIcon ? (
          <LockKeyhole className="h-4 w-4" />
        ) : (
          <AlertTriangle
            className={
              copy.kind === "trial-active"
                ? "h-4 w-4 text-info"
                : "h-4 w-4 text-warning"
            }
          />
        )}
        <AlertTitle>{copy.title}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{copy.description}</span>
          <Button
            size="sm"
            variant={useLockIcon ? "secondary" : "outline"}
            onClick={() => router.push(SUBSCRIPTION_SETTINGS_PATH)}
            className="self-start sm:self-auto"
          >
            {copy.ctaLabel}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
