import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormFieldGroup,
  Input
} from "@workspace/ui/components";
import type { AppAuthUser, User } from "@workspace/types";
import { useTranslations } from "next-intl";
import { SignatureUploadQR } from "@/features/settings/components/signature-upload-qr";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PenLine,
} from "lucide-react";
import { toAbsoluteApiUrl } from "@/lib/utils/api-url";
import { getDoctorVerificationPublicNote } from "@/lib/formatters/doctor-verification-display";

/**
 * Phase 3 (per-feature): apps/app Settings > Doctor profile sections
 * (digital signature + medical registration + HPR ID). 7 literals
 * converted to useTranslations("Settings.doctorProfile").
 */
function useDoctorProfileTranslations() {
  return useTranslations("Settings.doctorProfile");
}

type DoctorProfile = User | AppAuthUser;

// Component (not a helper) because it calls useTranslations — a React
// hook. Helpers that invoke hooks violate react-hooks/rules-of-hooks and
// risk the hook state desyncing across calls.
export function RegistrationStatusBadge({
  hasRegistration,
  verificationStatus,
}: {
  hasRegistration: boolean;
  verificationStatus: DoctorProfile["verificationStatus"] | undefined;
}) {
  const t = useDoctorProfileTranslations();
  if (!hasRegistration) return null;
  if (verificationStatus === "VERIFIED") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-primary/30 text-primary"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("statusVerified")}
      </Badge>
    );
  }
  if (verificationStatus === "PENDING") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {t("statusPending")}
      </Badge>
    );
  }
  if (verificationStatus === "FAILED" || verificationStatus === "REJECTED") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t("statusFailed")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <PenLine className="h-3.5 w-3.5" />
      {t("statusNotVerified")}
    </Badge>
  );
}

export function DigitalSignatureCard({
  signatureUrl,
}: {
  signatureUrl: string | null | undefined;
}) {
  const t = useDoctorProfileTranslations();
  const hasSignature = !!signatureUrl;
  const resolvedSignatureUrl = signatureUrl
    ? toAbsoluteApiUrl(signatureUrl)
    : null;

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{t("digitalSignatureTitle")}</CardTitle>
            <CardDescription>
              {t("digitalSignatureDescription")}
            </CardDescription>
          </div>
          {hasSignature && (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 text-primary"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("uploadedBadge")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        {hasSignature && resolvedSignatureUrl && (
          <div className="flex min-h-[100px] items-center justify-center rounded-[calc(var(--radius)-4px)] border border-border/60 bg-card p-4">
            <img
              src={resolvedSignatureUrl}
              alt={t("signatureAlt")}
              className="max-h-24 max-w-full object-contain"
            />
          </div>
        )}
        {!hasSignature && (
          <div className="rounded-[calc(var(--radius)-4px)] border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <PenLine className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("noSignatureTitle")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("noSignatureHelper")}
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
  const t = useDoctorProfileTranslations();
  const hasRegistration = !!profile?.registrationNumber;
  const registrationProfile = hasRegistration && profile ? profile : null;
  const verificationStatus = profile?.verificationStatus;
  const registrationVerificationNote = getDoctorVerificationPublicNote(
    verificationStatus,
    profile?.verificationReason,
  );
  const registrationStatusBadge = (
    <RegistrationStatusBadge
      hasRegistration={hasRegistration}
      verificationStatus={verificationStatus}
    />
  );
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{t("medicalRegistrationTitle")}</CardTitle>
            <CardDescription>
              {t("medicalRegistrationDescription")}
            </CardDescription>
          </div>
          {registrationStatusBadge}
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
                <Link href="/verify-doctor">{t("updateRegistrationButton")}</Link>
              </Button>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

export function HprIdCard({
  value,
  savedValue,
  isPending,
  onChange,
  onSave,
}: {
  value: string;
  savedValue: string;
  isPending: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const t = useDoctorProfileTranslations();
  const hasSavedValue = savedValue.trim().length > 0;
  const isDirty = value.trim() !== savedValue.trim();

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{t("hprIdTitle")}</CardTitle>
            <CardDescription>
              {t("hprIdDescription")}
            </CardDescription>
          </div>
          {hasSavedValue ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 text-primary"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("hprIdSaved")}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t("hprIdPending")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        <FormFieldGroup
          label={t("hprIdLabel")}
          htmlFor="doctor-hpr-id"
          hint={t("hprIdHint")}
        >
          <Input
            id="doctor-hpr-id"
            autoComplete="off"
            placeholder={t("hprIdPlaceholder")}
            className="font-mono text-[var(--fs-sm)] tracking-tight"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </FormFieldGroup>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSave}
            disabled={isPending || !isDirty}
          >
            {isPending ? t("savingLabel") : t("saveHprIdButton")}
          </Button>
        </div>
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
  const t = useDoctorProfileTranslations();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/30 px-4 py-3">
        <span className="ui-eyebrow">{t("regNumberLabel")}</span>
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
              {t("issuingCouncilLabel")}{" "}
              <span className="text-foreground">
                {profile.registrationCouncil}
              </span>
            </>
          ) : null}
          {profile.registrationStateCode ? (
            <>
              {profile.registrationCouncil ? " · " : null}
              {t("regionLabel")}{" "}
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
  const t = useDoctorProfileTranslations();
  return (
    <div className="flex items-center justify-between rounded-[calc(var(--radius)-4px)] border border-dashed border-border/70 bg-muted/30 px-4 py-3">
      <p className="text-sm text-muted-foreground">{t("notProvidedLabel")}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/verify-doctor">{t("addRegistrationButton")}</Link>
      </Button>
    </div>
  );
}
