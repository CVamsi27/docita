import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import type { AppAuthUser, User } from "@workspace/types";
import { SignatureUploadQR } from "@/features/settings/components/signature-upload-qr";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { toAbsoluteApiUrl } from "@/lib/utils/api-url";
import { getDoctorVerificationPublicNote } from "@/lib/formatters/doctor-verification-display";

type RegistrationStatusBadge = {
  label: string;
  variant: "outline" | "secondary" | "destructive";
  className: string;
  Icon: LucideIcon;
};
type DoctorProfile = User | AppAuthUser;

export function resolveRegistrationStatusBadge(
  hasRegistration: boolean,
  verificationStatus: DoctorProfile["verificationStatus"] | undefined,
): RegistrationStatusBadge | null {
  if (!hasRegistration) return null;
  if (verificationStatus === "VERIFIED") {
    return {
      label: "Verified",
      variant: "outline",
      className: "gap-1.5 border-primary/30 text-primary",
      Icon: CheckCircle2,
    };
  }
  if (verificationStatus === "PENDING") {
    return {
      label: "Verification in progress",
      variant: "secondary",
      className: "gap-1.5",
      Icon: Clock,
    };
  }
  if (verificationStatus === "FAILED" || verificationStatus === "REJECTED") {
    return {
      label: "Could not verify",
      variant: "destructive",
      className: "gap-1.5",
      Icon: AlertTriangle,
    };
  }
  return {
    label: "Not verified yet",
    variant: "outline",
    className: "gap-1.5 text-muted-foreground",
    Icon: PenLine,
  };
}

export function DigitalSignatureCard({
  signatureUrl,
}: {
  signatureUrl: string | null | undefined;
}) {
  const hasSignature = !!signatureUrl;
  const resolvedSignatureUrl = signatureUrl
    ? toAbsoluteApiUrl(signatureUrl)
    : null;

  return (
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
  );
}
export function MedicalRegistrationCard({
  profile,
}: {
  profile: DoctorProfile | null | undefined;
}) {
  const hasRegistration = !!profile?.registrationNumber;
  const registrationProfile = hasRegistration && profile ? profile : null;
  const verificationStatus = profile?.verificationStatus;
  const registrationVerificationNote = getDoctorVerificationPublicNote(
    verificationStatus,
    profile?.verificationReason,
  );
  const registrationStatusBadge = resolveRegistrationStatusBadge(
    hasRegistration,
    verificationStatus,
  );
  const RegistrationBadgeIcon = registrationStatusBadge?.Icon;
  return (
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
        {registrationProfile ? (
          <RegistrationDetails
            profile={registrationProfile}
            registrationVerificationNote={registrationVerificationNote}
          />
        ) : (
          <MissingRegistrationNotice />
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
  );
}

function RegistrationDetails({
  profile,
  registrationVerificationNote,
}: {
  profile: DoctorProfile;
  registrationVerificationNote: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/30 px-4 py-3">
        <span className="ui-eyebrow">Reg #</span>
        <span className="ui-mono text-sm font-medium text-foreground">
          {profile.registrationNumber}
        </span>
      </div>
      {registrationVerificationNote ? (
        <p className="text-xs text-muted-foreground">
          {registrationVerificationNote}
        </p>
      ) : null}
      {(profile.registrationCouncil || profile.registrationStateCode) && (
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
  );
}

function MissingRegistrationNotice() {
  return (
    <div className="flex items-center justify-between rounded-[calc(var(--radius)-4px)] border border-dashed border-border/70 bg-muted/30 px-4 py-3">
      <p className="text-sm text-muted-foreground">Not provided</p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/verify-doctor">Add registration number</Link>
      </Button>
    </div>
  );
}
