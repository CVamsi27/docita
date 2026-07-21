"use client";

import type { Control } from "react-hook-form";
import type { SecuritySettingsFormValues } from "@workspace/types";
import { Feature } from "@workspace/types";
import { Button, FormControl, FormField, FormItem, FormMessage, Input, Label, Switch } from "@workspace/ui/components";
import { Lock } from "lucide-react";
import Link from "next/link";
import { FeatureTierBadge } from "@/components/auth/feature-gate";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export function TwoFactorAuthSection({
  control,
}: {
  control: Control<SecuritySettingsFormValues>;
}) {
  return (
    <FormField
      control={control}
      name="twoFactorAuth"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between space-y-0 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
          <div className="space-y-1">
            <Label htmlFor="two-factor-auth">
              Two-Factor Authentication
            </Label>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security
            </p>
          </div>
          <FormControl>
            <Switch
              id="two-factor-auth"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function SessionTimeoutSection({
  control,
}: {
  control: Control<SecuritySettingsFormValues>;
}) {
  return (
    <FormField
      control={control}
      name="sessionTimeout"
      render={({ field }) => (
        <FormItem className="space-y-0 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="session-timeout">
                Session Timeout (minutes)
              </Label>
              <p className="text-sm text-muted-foreground">
                Auto logout after inactivity
              </p>
            </div>
            <div className="flex flex-col items-end">
              <FormControl id="session-timeout">
                <Input
                  id="session-timeout"
                  type="number"
                  autoComplete="off"
                  inputMode="numeric"
                  min={5}
                  max={240}
                  step={5}
                  {...field}
                  className="ui-mono w-24 text-right"
                />
              </FormControl>
              <FormMessage className="mt-1 text-right" />
            </div>
          </div>
        </FormItem>
      )}
    />
  );
}

export function AuditLogsSection({
  control,
  canAccess,
}: {
  control: Control<SecuritySettingsFormValues>;
  canAccess: (feature: Feature) => boolean;
}) {
  return (
    <FormField
      control={control}
      name="auditLogs"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between space-y-0 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="audit-logs">Enable Audit Logs</Label>
              {!canAccess(Feature.AUDIT_LOGS) ? (
                <FeatureTierBadge
                  feature={Feature.AUDIT_LOGS}
                  className="h-5"
                />
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Track all user actions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!canAccess(Feature.AUDIT_LOGS) ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Link href={SUBSCRIPTION_SETTINGS_PATH}>
                  <Lock className="mr-2 h-3 w-3" />
                  Upgrade
                </Link>
              </Button>
            ) : (
              <FormControl>
                <Switch
                  id="audit-logs"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            )}
          </div>
        </FormItem>
      )}
    />
  );
}
