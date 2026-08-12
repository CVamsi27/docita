import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { securitySettingsFormSchema, type SecuritySettingsFormValues } from "@workspace/types";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Form } from "@workspace/ui/components";
import { useTranslation } from "react-i18next";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useClinicSettings, useUpdateClinicSettings } from "@workspace/data-access";
import { parseClinicAppSettings } from "@/lib/clinic/parse-clinic-app-settings";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { TwoFactorAuthSection } from "./SecuritySettingsSections";
import { SessionTimeoutSection } from "./SecuritySettingsSections";
import { AuditLogsSection } from "./SecuritySettingsSections";

export function SecuritySettings() {
  const { t } = useTranslation("Settings.security");
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();
  const canAccess = usePermissionStore((s) => s.canAccess);

  const form = useForm<SecuritySettingsFormValues>({
    resolver: zodResolver(securitySettingsFormSchema),
    defaultValues: {
      twoFactorAuth: false,
      sessionTimeout: "30",
      auditLogs: true,
    },
  });

  useEffect(() => {
    if (clinic) {
      const s = parseClinicAppSettings(clinic.settings);
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
          toast.success(t("saveSuccess"));
        },
        onError: (error) => {
          showUserFacingErrorToast(error, t("saveError"), "save");
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
        aria-label={t("loadingAria")}
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
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="flex flex-col gap-5"
            noValidate
          >
            <TwoFactorAuthSection control={form.control} />
            <SessionTimeoutSection control={form.control} />
            <AuditLogsSection control={form.control} canAccess={canAccess} />

            <div className="flex justify-end border-t border-border/60 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                ) : null}
                {t("saveButton")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
