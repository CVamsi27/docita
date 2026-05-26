"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { useAuth } from "@/lib/auth/auth-context";
import { appQueryKeys } from "@workspace/data-access";
import { useAPIQuery } from "@/lib/api/api-core";
import type { User } from "@workspace/types";
import { SignatureUploadQR } from "@/features/settings/components/signature-upload-qr";
import { RegistrationCertificateUpload } from "@/features/settings/components/doctor-profile/RegistrationCertificateUpload";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PenLine,
} from "lucide-react";
import { toAbsoluteApiUrl } from "@/lib/utils/url";
import { getDoctorVerificationPublicNote } from "@/lib/formatters/doctor-verification-display";

export function DoctorProfileSettings() {
  const { user } = useAuth();

  const { data: doctorProfile } = useAPIQuery<User>(
    appQueryKeys.doctorProfile.detail(user?.id ?? ""),
    `/doctors/${user?.id}`,
    { enabled: !!user?.id },
  );

  const profile = doctorProfile ?? user;
  const hasSignature = !!profile?.signatureUrl;
  const hasRegistration = !!profile?.registrationNumber;
  const resolvedSignatureUrl = profile?.signatureUrl
    ? toAbsoluteApiUrl(profile.signatureUrl)
    : null;
  const verificationStatus = profile?.verificationStatus;
  const registrationVerificationNote = getDoctorVerificationPublicNote(
    verificationStatus,
    profile?.verificationReason,
  );

  const registrationStatusBadge =
    hasRegistration && verificationStatus === "VERIFIED"
      ? {
          label: "Verified",
          variant: "outline" as const,
          className:
            "gap-1.5 border-primary/30 text-primary",
          Icon: CheckCircle2,
        }
      : hasRegistration && verificationStatus === "PENDING"
        ? {
            label: "Verification in progress",
            variant: "secondary" as const,
            className: "gap-1.5",
            Icon: Clock,
          }
        : hasRegistration &&
            (verificationStatus === "FAILED" ||
              verificationStatus === "REJECTED")
          ? {
              label: "Could not verify",
              variant: "destructive" as const,
              className: "gap-1.5",
              Icon: AlertTriangle,
            }
          : hasRegistration
            ? {
                label: "Not verified yet",
                variant: "outline" as const,
                className: "gap-1.5 text-muted-foreground",
                Icon: PenLine,
              }
            : null;

  const RegistrationBadgeIcon = registrationStatusBadge?.Icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Digital signature</CardTitle>
              <CardDescription>
                Your signature appears on prescriptions and medical documents.
              </CardDescription>
            </div>
            {hasSignature && (
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Uploaded
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSignature && resolvedSignatureUrl && (
            <div className="flex min-h-[100px] items-center justify-center rounded-lg border bg-white p-4">
              <img
                src={resolvedSignatureUrl}
                alt="Your current signature"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
          )}
          {!hasSignature && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
              <PenLine className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No signature uploaded yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your signature to generate prescriptions.
              </p>
            </div>
          )}
          <SignatureUploadQR />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Medical Registration Number
              </CardTitle>
              <CardDescription>
                Your council registration number for regulatory compliance.
              </CardDescription>
            </div>
            {registrationStatusBadge && RegistrationBadgeIcon ? (
              <Badge
                variant={registrationStatusBadge.variant}
                className={registrationStatusBadge.className}
              >
                <RegistrationBadgeIcon className="h-3.5 w-3.5" />
                {registrationStatusBadge.label}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {hasRegistration ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Registration Number
                </span>
                <span className="font-mono text-sm font-medium text-foreground">
                  {profile?.registrationNumber}
                </span>
              </div>
              {registrationVerificationNote ? (
                <p className="text-xs text-muted-foreground">
                  {registrationVerificationNote}
                </p>
              ) : null}
              {(profile?.registrationCouncil ||
                profile?.registrationStateCode) && (
                <p className="text-xs text-muted-foreground">
                  {profile.registrationCouncil ? (
                    <>
                      Issuing council:{" "}
                      <span className="text-foreground">
                        {profile.registrationCouncil}
                      </span>
                    </>
                  ) : null}
                  {profile.registrationStateCode ? (
                    <>
                      {profile.registrationCouncil ? " · " : null}
                      Region:{" "}
                      <span className="text-foreground">
                        {profile.registrationStateCode}
                      </span>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">Not provided</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/verify-doctor">Add Registration Number</Link>
              </Button>
            </div>
          )}
          {hasRegistration &&
            (verificationStatus === "REJECTED" ||
              verificationStatus === "FAILED") && (
              <div className="mt-3 flex items-center justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/verify-doctor">Update Registration Details</Link>
                </Button>
              </div>
            )}
        </CardContent>
      </Card>

      {hasRegistration && profile?.id && (
        <RegistrationCertificateUpload
          doctorId={profile.id}
          certificateUrl={profile.registrationCertificateUrl}
          verificationStatus={verificationStatus}
        />
      )}
    </div>
  );
}
