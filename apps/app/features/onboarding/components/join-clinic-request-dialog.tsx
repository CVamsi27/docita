"use client";

// jscpd:ignore-start
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components";
import { useTranslations } from "next-intl";
// jscpd:ignore-end
import type { JoinClinicSearchResult } from "@/features/onboarding/components/join-clinic-search-results";

/**
 * Phase 3 (per-feature): apps/app Onboarding > Join clinic request
 * dialog. 7 literals converted to
 * useTranslations("Onboarding.joinClinicRequest").
 */
function useJoinClinicRequestTranslations() {
  return useTranslations("Onboarding.joinClinicRequest");
}

export function JoinClinicRequestDialog({
  clinic,
  requestedRole,
  message,
  isSubmitting,
  onOpenChange,
  onRoleChange,
  onMessageChange,
  onSubmit,
}: {
  clinic: JoinClinicSearchResult | null;
  requestedRole: string;
  message: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChange: (role: string) => void;
  onMessageChange: (message: string) => void;
  onSubmit: () => void;
}) {
  const t = useJoinClinicRequestTranslations();
  return (
    <Dialog
      open={!!clinic}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title", { name: clinic?.name ?? "" })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("roleLabel")}</label>
            <Select value={requestedRole} onValueChange={onRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOCTOR">{t("roleDoctor")}</SelectItem>
                <SelectItem value="NURSE">{t("roleNurse")}</SelectItem>
                <SelectItem value="RECEPTIONIST">{t("roleReceptionist")}</SelectItem>
                <SelectItem value="ADMIN_DOCTOR">{t("roleAdminDoctor")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="ui-helper-text">
              {t("roleHelper")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("messageLabel")}{" "}
              <span className="text-muted-foreground">{t("optionalSuffix")}</span>
            </label>
            <Textarea
              placeholder={t("messagePlaceholder")}
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="ui-helper-text text-right">{t("charCount", { count: message.length })}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("cancelButton")}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? t("submittingLabel") : t("submitButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
