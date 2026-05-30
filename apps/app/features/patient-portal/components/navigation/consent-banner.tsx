"use client";

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Label } from "@workspace/ui/components/form/label";
import { Bell, Shield } from "lucide-react";
import {
  usePatientConsentSettings,
  useUpdatePatientConsent,
} from "@workspace/data-access";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function ConsentBanner() {
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

      toast.success("Your privacy preferences have been updated");

      setDismissed(true);
    } catch (_error) {
      showUserFacingErrorToast(
        "We could not save your consent preferences. Please try again.",
      );
    }
  };

  const open = !isLoading && !dismissed && Boolean(consentSettings?.isFirstLogin);

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
            <DialogTitle>Privacy &amp; consent</DialogTitle>
          </div>
          <DialogDescription>
            Welcome to the Patient Portal! Please review and accept our privacy
            preferences.
          </DialogDescription>
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
                WhatsApp notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive appointment reminders and health updates via WhatsApp
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
                Data storage consent
              </Label>
              <p className="text-sm text-muted-foreground">
                I consent to storing my health data securely for medical
                purposes
              </p>
            </div>
            <Shield className="mt-1 h-4 w-4 text-muted-foreground" />
          </div>

          <p className="text-xs text-muted-foreground">
            You can change these preferences anytime in your profile settings.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDismissed(true)}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleSaveConsent}
            disabled={updateConsent.isPending}
            className="flex-1"
          >
            {updateConsent.isPending ? "Saving…" : "Save preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
