"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Label } from "@workspace/ui/components/form/label";
import { Switch } from "@workspace/ui/components/form/switch";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Lock } from "lucide-react";
import Link from "next/link";
import { Feature } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { FeatureTierBadge } from "@/components/auth/feature-gate";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form/form";

const securitySettingsSchema = z.object({
  twoFactorAuth: z.boolean(),
  sessionTimeout: z
    .string()
    .min(1, "Enter a session timeout")
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 5 && parsed <= 240;
    }, "Use a value between 5 and 240 minutes"),
  auditLogs: z.boolean(),
});

type SecuritySettingsFormValues = z.infer<typeof securitySettingsSchema>;

export function SecuritySettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();
  const { canAccess } = usePermissionStore();

  const form = useForm<SecuritySettingsFormValues>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      twoFactorAuth: false,
      sessionTimeout: "30",
      auditLogs: true,
    },
  });

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      form.reset({
        twoFactorAuth: s.twoFactorAuth ?? false,
        sessionTimeout: String(s.sessionTimeout || "30"),
        auditLogs: s.auditLogs ?? true,
      });
    }
  }, [clinic, form]);

  const handleSave = (values: SecuritySettingsFormValues) => {
    updateSettings(
      {
        twoFactorAuth: values.twoFactorAuth,
        sessionTimeout: values.sessionTimeout,
        auditLogs: values.auditLogs,
      },
      {
        onSuccess: () => {
          toast.success("Security settings saved successfully");
        },
        onError: (error) => {
          showUserFacingErrorToast(
            error,
            "We could not save your security settings. Please try again.",
            "save",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div
        className="flex justify-center p-8"
        role="status"
        aria-live="polite"
        aria-label="Loading security settings"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage security and access controls</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="space-y-6"
            noValidate
          >
            <FormField
              control={form.control}
              name="twoFactorAuth"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
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

            <FormField
              control={form.control}
              name="sessionTimeout"
              render={({ field }) => (
                <FormItem className="space-y-0">
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
                          className="w-24 text-right"
                        />
                      </FormControl>
                      <FormMessage className="mt-1 text-right" />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auditLogs"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
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
                      <Button asChild variant="outline" size="sm" className="h-8">
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

            <Button className="w-full" type="submit" disabled={isSaving}>
              {isSaving ? <DocitaLoadingIndicator variant="inline" decorative className="mr-2" /> : null}
              Save Security Settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
