"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { AlertCircle, Bell, Printer, Shield, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  usePatientConsentSettings,
  useRequestDataDeletion,
  useUpdatePatientConsent,
} from "@/hooks/api/use-patient-portal";
import { PageHeader } from "@workspace/ui/components/page-header";
import { toast } from "sonner";
import { Textarea } from "@workspace/ui/components/textarea";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { formatDate } from "@/lib/formatters";

export default function PatientProfilePage() {
  const [deletionReason, setDeletionReason] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const { data: consentSettings } = usePatientConsentSettings();
  const updateConsent = useUpdatePatientConsent();
  const requestDeletion = useRequestDataDeletion();

  const handleConsentChange = async (
    field: "whatsappConsent" | "dataStorageConsent",
    value: boolean,
  ) => {
    try {
      await updateConsent.mutateAsync({
        [field]: value,
      });

      toast.success("Your consent preferences have been saved");
    } catch (_error) {
      showUserFacingErrorToast(
        "We could not save your preferences. Please try again.",
      );
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletionReason.trim()) {
      showUserFacingErrorToast(
        "Tell us why you want to delete your account before continuing",
      );
      return;
    }

    if (!confirmDeletion) {
      showUserFacingErrorToast(
        "Please confirm that you want to delete your account before submitting",
      );
      return;
    }

    try {
      await requestDeletion.mutateAsync({
        reason: deletionReason,
        confirmDeletion: true,
      });

      toast.success(
        "Account deletion requested. Your account will be deleted within 30 days.",
      );
    } catch (_error) {
      showUserFacingErrorToast(
        "We could not submit this deletion request. Please try again.",
      );
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Profile Settings"
          description="Manage your personal information and privacy preferences"
        />
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Privacy & Consent</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/profile/consent-form" target="_blank">
                <Printer className="mr-2 h-4 w-4" />
                Print Consent Form
              </Link>
            </Button>
          </div>
          <CardDescription>
            Manage how we communicate with you and use your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between rounded-lg border p-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="whatsapp-consent" className="font-medium">
                  WhatsApp Notifications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receive appointment reminders and health updates via WhatsApp
              </p>
              {consentSettings?.whatsappConsentAt && (
                <p className="text-xs text-muted-foreground">
                  Consent given on
                  <span className="ml-1">
                    {formatDate(consentSettings.whatsappConsentAt)}
                  </span>
                </p>
              )}
            </div>
            <Checkbox
              id="whatsapp-consent"
              checked={consentSettings?.whatsappConsent || false}
              onCheckedChange={(checked) =>
                handleConsentChange("whatsappConsent", !!checked)
              }
              disabled={updateConsent.isPending}
            />
          </div>

          <div className="flex items-start justify-between rounded-lg border p-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="storage-consent" className="font-medium">
                  Data Storage Consent
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                I consent to storing my health data securely for medical
                purposes
              </p>
            </div>
            <Checkbox
              id="storage-consent"
              checked={consentSettings?.dataStorageConsent ?? false}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">
              Delete Account & Data
            </CardTitle>
          </div>
          <CardDescription>
            Permanently delete your account and all associated health data
            (GDPR/DPDP compliant)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action cannot be undone. All your appointments,
              prescriptions, invoices, and medical records will be permanently
              deleted after 30 days.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="deletion-reason">
              Reason for deletion (required)
            </Label>
            <Textarea
              id="deletion-reason"
              placeholder="Enter deletion reason"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm-deletion"
              checked={confirmDeletion}
              onCheckedChange={(checked) => setConfirmDeletion(!!checked)}
            />
            <Label htmlFor="confirm-deletion" className="text-sm font-normal">
              I understand this action cannot be undone and all my data will be
              permanently deleted
            </Label>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDeleteAccount}
            disabled={
              requestDeletion.isPending || !deletionReason || !confirmDeletion
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {requestDeletion.isPending
              ? "Processing…"
              : "Delete My Account & Data"}
          </Button>
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
}
