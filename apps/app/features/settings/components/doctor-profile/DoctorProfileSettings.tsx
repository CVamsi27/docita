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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Digital signature</CardTitle>
              <CardDescription>
                Appears on prescriptions and medical documents you generate.
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
        <CardContent className="flex flex-col gap-4 pt-5">
          {hasSignature && resolvedSignatureUrl && (
            <div className="flex min-h-[100px] items-center justify-center rounded-[calc(var(--radius)-4px)] border border-border/60 bg-card p-4">
              <img
                src={resolvedSignatureUrl}
                alt="Your current signature"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
          )}
          {!hasSignature && (
            <div className="rounded-[calc(var(--radius)-4px)] border border-dashed border-border/70 bg-muted/30 p-6 text-center">
              <PenLine className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No signature uploaded yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your signature to generate prescriptions.
              </p>
            </div>
          )}
          <SignatureUploadQR />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Medical registration</CardTitle>
              <CardDescription>
                Council registration number used for regulatory compliance.
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
        <CardContent className="pt-5">
          {hasRegistration ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/30 px-4 py-3">
                <span className="ui-eyebrow">Reg #</span>
                <span className="ui-mono text-sm font-medium text-foreground">
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
            <div className="flex items-center justify-between rounded-[calc(var(--radius)-4px)] border border-dashed border-border/70 bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">Not provided</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/verify-doctor">Add registration number</Link>
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
