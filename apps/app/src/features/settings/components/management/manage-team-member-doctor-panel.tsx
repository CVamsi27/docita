import { Link } from "react-router";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { ShieldCheck, ShieldX } from "lucide-react";
import { User } from "@workspace/types";
import { useTranslation } from "react-i18next";
import { getDoctorVerificationPublicNote } from "@workspace/utils";
import { DoctorRegistrationFields } from "@/features/settings/components/management/team-member-form-fields";
import type { MemberFormValues } from "@/features/settings/components/management/member-management-schemas";
import type {
  VerificationBadgeLabelFn,
  VerificationBadgeVariantFn,
} from "@/features/settings/components/management/member-verification-badge";

export function ManageTeamMemberDoctorPanel({
  member,
  memberForm,
  isManaging,
  isReverifyingDoctor,
  onReverifyDoctor,
  getVerificationBadgeVariant,
  getVerificationBadgeLabel,
  formatDate,
}: {
  member: User;
  memberForm: UseFormReturn<MemberFormValues>;
  isManaging: boolean;
  isReverifyingDoctor: boolean;
  onReverifyDoctor: (doctorId: string) => void;
  getVerificationBadgeVariant: VerificationBadgeVariantFn;
  getVerificationBadgeLabel: VerificationBadgeLabelFn;
  formatDate: (value?: string | Date) => string;
}) {
  const { t } = useTranslation("Settings.manageTeamMemberDoctorPanel");
  const verificationPublicNote = getDoctorVerificationPublicNote(
    member.verificationStatus,
    member.verificationReason,
  );

  return (
    <>
      <DoctorRegistrationFields form={memberForm} t={t} />

      <div className="rounded-lg border bg-surface-2 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={getVerificationBadgeVariant(member.verificationStatus)}
            >
              {member.verificationStatus === "VERIFIED" ? (
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              ) : (
                <ShieldX className="mr-1 h-3.5 w-3.5" />
              )}
              {getVerificationBadgeLabel(member.verificationStatus, t)}
            </Badge>
            <Badge variant={member.signatureUploadedAt ? "default" : "outline"}>
              {t("signatureLabel")} {member.signatureUploadedAt ? t("signatureReady") : t("signatureMissing")}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>{t("lastVerificationLabel", { date: formatDate(member.verificationCheckedAt) })}</p>
            <p>{t("signatureUploadedLabel", { date: formatDate(member.signatureUploadedAt) })}</p>
            {verificationPublicNote ? (
              <p>{t("statusDetailsLabel", { note: verificationPublicNote })}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {!member.signatureUploadedAt ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to="/verify-doctor">{t("completeVerificationButton")}</Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onReverifyDoctor(member.id)}
              disabled={isManaging}
            >
              {isReverifyingDoctor ? (
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
              ) : null}
              {t("reverifyButton")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
