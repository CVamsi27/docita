"use client";
// jscpd:ignore-start

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
// jscpd:ignore-end
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Button } from "@workspace/ui/components/form/button";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Label } from "@workspace/ui/components/form/label";
import { AlertCircle, Bell, Printer, Shield, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import {
  usePatientConsentSettings,
  useRequestDataDeletion,
  useUpdatePatientConsent,
} from "@workspace/data-access";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { toast } from "sonner";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { formatDate } from "@/lib/formatters";

type ConsentSettings = { whatsappConsent?: boolean; dataStorageConsent?: boolean; marketingConsent?: boolean; whatsappConsentAt?: string | null };
type OnConsentChange = (field: "whatsappConsent" | "dataStorageConsent" | "marketingConsent", value: boolean) => void;

/**
 * Phase 3 (per-feature): patient portal profile page is a real
 * user-facing surface (a patient sees this, not a clinic admin).
 * Same pattern as AllergyEditDialog (279cf9e53) and
 * DoctorsViewDialogSections (248e6a284). Every visible string
 * resolves through useTranslations("PatientPortal.profile") with
 * the hardcoded English as the runtime fallback.
 */
function usePortalProfileTranslations() {
  return useTranslations("PatientPortal.profile");
}

function ConsentCard({
  consentSettings,
  onConsentChange,
  isPending,
}: {
  consentSettings: ConsentSettings | undefined;
  onConsentChange: OnConsentChange;
  isPending: boolean;
}) {
  const t = usePortalProfileTranslations();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>{t("consentTitle")}</CardTitle>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/portal/profile/consent-form" target="_blank" rel="noopener noreferrer">
              <Printer className="mr-2 h-4 w-4" />
              {t("printConsentForm")}
            </Link>
          </Button>
        </div>
        <CardDescription>{t("consentDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="whatsapp-consent" className="font-medium">
                {t("whatsappConsentLabel")}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">{t("whatsappConsentBody")}</p>
            {consentSettings?.whatsappConsentAt && (
              <p className="text-xs text-muted-foreground">
                {t("consentGivenOn")}
                <span className="ml-1">{formatDate(consentSettings.whatsappConsentAt)}</span>
              </p>
            )}
          </div>
          <Checkbox
            id="whatsapp-consent"
            checked={consentSettings?.whatsappConsent || false}
            onCheckedChange={(checked) => onConsentChange("whatsappConsent", !!checked)}
            disabled={isPending}
          />
        </div>
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="storage-consent" className="font-medium">
                {t("dataStorageConsentLabel")}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">{t("dataStorageConsentBody")}</p>
          </div>
          <Checkbox id="storage-consent" checked={consentSettings?.dataStorageConsent ?? false} disabled />
        </div>
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="marketing-consent" className="font-medium">
                {t("marketingConsentLabel")}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">{t("marketingConsentBody")}</p>
          </div>
          <Checkbox
            id="marketing-consent"
            checked={consentSettings?.marketingConsent ?? false}
            onCheckedChange={(checked) => onConsentChange("marketingConsent", !!checked)}
            disabled={isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DeletionCard({
  deletionReason,
  confirmDeletion,
  isPending,
  onReasonChange,
  onConfirmChange,
  onDelete,
}: {
  deletionReason: string;
  confirmDeletion: boolean;
  isPending: boolean;
  onReasonChange: (value: string) => void;
  onConfirmChange: (checked: boolean) => void;
  onDelete: () => void;
}) {
  const t = usePortalProfileTranslations();
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{t("deletionTitle")}</CardTitle>
        </div>
        <CardDescription>{t("deletionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("warningTitle")}</AlertTitle>
          <AlertDescription>{t("warningBody")}</AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Label htmlFor="deletion-reason">{t("deletionReasonLabel")}</Label>
          <Textarea
            id="deletion-reason"
            placeholder={t("deletionReasonPlaceholder")}
            value={deletionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirm-deletion"
            checked={confirmDeletion}
            onCheckedChange={(checked) => onConfirmChange(!!checked)}
          />
          <Label htmlFor="confirm-deletion" className="text-sm font-normal">
            {t("deletionConfirmLabel")}
          </Label>
        </div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={onDelete}
          disabled={isPending || !deletionReason || !confirmDeletion}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isPending ? t("processing") : t("deletionButton")}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PatientProfilePage() {
  const t = usePortalProfileTranslations();
  const [deletionReason, setDeletionReason] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const { data: consentSettings } = usePatientConsentSettings();
  const updateConsent = useUpdatePatientConsent();
  const requestDeletion = useRequestDataDeletion();

  const handleConsentChange: OnConsentChange = async (field, value) => {
    try {
      await updateConsent.mutateAsync({ [field]: value });
      toast.success(t("consentSavedToast"));
    } catch {
      showUserFacingErrorToast(t("consentSaveError"));
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletionReason.trim()) {
      showUserFacingErrorToast(t("deletionReasonRequired"));
      return;
    }
    if (!confirmDeletion) {
      showUserFacingErrorToast(t("deletionConfirmRequired"));
      return;
    }
    try {
      await requestDeletion.mutateAsync({ reason: deletionReason, confirmDeletion: true });
      toast.success(t("deletionRequestedToast"));
    } catch {
      showUserFacingErrorToast(t("deletionRequestError"));
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
        />
      }
    >
      <ConsentCard
        consentSettings={consentSettings}
        onConsentChange={handleConsentChange}
        isPending={updateConsent.isPending}
      />
      <DeletionCard
        deletionReason={deletionReason}
        confirmDeletion={confirmDeletion}
        isPending={requestDeletion.isPending}
        onReasonChange={setDeletionReason}
        onConfirmChange={setConfirmDeletion}
        onDelete={handleDeleteAccount}
      />
    </AppPageScaffold>
  );
}
