"use client";

// jscpd:ignore-start
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from "@workspace/ui/components";
import { Bell, Shield } from "lucide-react";
import {
  usePatientConsentSettings,
// jscpd:ignore-end
  useUpdatePatientConsent,
} from "@workspace/data-access";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function ConsentBanner() {
  const { t } = useTranslation("PatientPortal");
  const [dismissed, setDismissed] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [dataStorageConsent, setDataStorageConsent] = useState(false);

  const { data: consentSettings, isLoading } = usePatientConsentSettings();
  const updateConsent = useUpdatePatientConsent();

  useEffect(() => {
    if (consentSettings && !consentSettings.isFirstLogin) {
      setDismissed(true);
    }
  }, [consentSettings]);

  const handleSaveConsent = async () => {
    try {
      await updateConsent.mutateAsync({
        whatsappConsent,
        dataStorageConsent,
      });

      toast.success(t("consentBanner.savedToast"));

      setDismissed(true);
    } catch (_error) {
      showUserFacingErrorToast(t("consentBanner.saveError"));
    }
  };

  const open =
    !isLoading && !dismissed && Boolean(consentSettings?.isFirstLogin);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true);
      }}
    >
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>{t("consentBanner.title")}</DialogTitle>
          </div>
          <DialogDescription>{t("consentBanner.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox
              id="whatsapp"
              checked={whatsappConsent}
              onCheckedChange={(checked) => setWhatsappConsent(!!checked)}
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="whatsapp" className="font-medium">
                {t("consentBanner.whatsappLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("consentBanner.whatsappHelper")}
              </p>
            </div>
            <Bell className="mt-1 h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox
              id="storage"
              checked={dataStorageConsent}
              onCheckedChange={(checked) => setDataStorageConsent(!!checked)}
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="storage" className="font-medium">
                {t("consentBanner.storageLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("profile.dataStorageConsentBody")}
              </p>
            </div>
            <Shield className="mt-1 h-4 w-4 text-muted-foreground" />
          </div>

          <p className="text-xs text-muted-foreground">
            {t("consentBanner.helperNote")}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDismissed(true)}
            className="flex-1"
          >
            {t("consentBanner.skip")}
          </Button>
          <Button
            onClick={handleSaveConsent}
            disabled={updateConsent.isPending}
            className="flex-1"
          >
            {updateConsent.isPending ? t("consentBanner.saving") : t("consentBanner.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
