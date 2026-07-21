"use client";

import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";
import { Badge, Button } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { ShieldCheck, ShieldX } from "lucide-react";
import { User } from "@workspace/types";
import { useTranslations } from "next-intl";
import { getDoctorVerificationPublicNote } from "@/lib/formatters/doctor-verification-display";
import { DoctorRegistrationFields } from "@/features/settings/components/management/team-member-form-fields";
import type { MemberFormValues } from "@/features/settings/components/management/member-management-schemas";

/**
 * Phase 3 (per-feature): apps/app Settings > Manage team member doctor
 * panel. 7 literals converted to
 * useTranslations("Settings.manageTeamMemberDoctorPanel").
 */
function useDoctorPanelTranslations() {
  return useTranslations("Settings.manageTeamMemberDoctorPanel");
}

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
  getVerificationBadgeVariant: (
    status?: User["verificationStatus"],
  ) => "default" | "secondary" | "destructive" | "outline";
  getVerificationBadgeLabel: (status?: User["verificationStatus"]) => string;
  formatDate: (value?: string | Date) => string;
}) {
  const t = useDoctorPanelTranslations();
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
              {getVerificationBadgeLabel(member.verificationStatus)}
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
                <Link href="/verify-doctor">{t("completeVerificationButton")}</Link>
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
