"use client";

// jscpd:ignore-start
import { FC } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@workspace/ui/components";
import { Copy, UserPlus } from "lucide-react";
import { User } from "@workspace/types";
import { isDoctor } from "@/lib/auth/permissions";
import { memberRoleDisplayLabel } from "@/features/settings/components/management/member-management-schemas";

// ---------------------------------------------------------------------------
// Pure badge helpers
// ---------------------------------------------------------------------------

/**
 * Phase 3 (per-feature): apps/app Settings > team member management helpers.
 * 5 literals converted to useTranslations("Settings.TeamManagement").
 */
function useTeamManagementTranslations() {
  return useTranslations("Settings.TeamManagement");
}

export function getVerificationBadgeVariant(
// jscpd:ignore-end
  status?: User["verificationStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "VERIFIED") return "default";
  if (status === "FAILED" || status === "REJECTED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

export function getVerificationBadgeLabel(
  status?: User["verificationStatus"],
  t?: (key: string) => string,
): string {
  if (!status) return t ? t("unverifiedLabel") : "Unverified";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

interface MemberManagementLoadingSkeletonProps {
  facilityLabel: string;
}

export const MemberManagementLoadingSkeleton: FC<
  MemberManagementLoadingSkeletonProps
> = ({ facilityLabel }) => {
  const t = useTeamManagementTranslations();
  return (
    <Card role="status" aria-live="polite" aria-label={t("loadingAriaLabel")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("subtitle", { facilityLabel: facilityLabel.toLowerCase() })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton variant="circular" className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Member list row
// ---------------------------------------------------------------------------

interface MemberListRowProps {
  member: User;
  onManage: (member: User) => void;
}

export const MemberListRow: FC<MemberListRowProps> = ({ member, onManage }) => {
  const t = useTeamManagementTranslations();
  const isDoctorUser = isDoctor(member.role);

  return (
    <div className="flex items-center justify-between rounded-[calc(var(--radius)-4px)] border border-transparent p-3 transition-colors hover:border-border/60 hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card font-medium text-foreground">
          {member.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-medium">{member.name || t("unknownLabel")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{member.email}</span>
            <Badge variant="outline">
              {memberRoleDisplayLabel(member.role)}
            </Badge>
            {isDoctorUser && (
              <>
                <Badge
                  variant={getVerificationBadgeVariant(
                    member.verificationStatus,
                  )}
                >
                  {getVerificationBadgeLabel(member.verificationStatus, t)}
                </Badge>
                <Badge
                  variant={member.signatureUploadedAt ? "default" : "outline"}
                >
                  {t("signatureLabel", {
                    status: member.signatureUploadedAt
                      ? t("signatureReady")
                      : t("signatureMissing"),
                  })}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onManage(member)}>
        {t("manageButton")}
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Card header toolbar
// ---------------------------------------------------------------------------

interface MemberCardHeaderProps {
  facilityLabel: string;
  clinicReferralCode?: string | null;
  canInvite: boolean;
  onCopyCode: () => void;
  onInvite: () => void;
}

export const MemberCardHeader: FC<MemberCardHeaderProps> = ({
  facilityLabel,
  clinicReferralCode,
  canInvite,
  onCopyCode,
  onInvite,
}) => {
  const t = useTeamManagementTranslations();
  return (
    <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>
          {t("cardSubtitle", { facilityLabel: facilityLabel.toLowerCase() })}
        </CardDescription>
      </div>
      <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <span className="ui-eyebrow">{t("codeLabel", { facilityLabel })}</span>
          <code className="ui-mono rounded-[calc(var(--radius)-6px)] border border-border/60 bg-muted/40 px-2 py-1 text-xs font-semibold tracking-wide text-foreground">
            {clinicReferralCode || t("codeUnavailable")}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopyCode}
            disabled={!clinicReferralCode}
          >
            <Copy className="mr-2 h-4 w-4" />
            {t("copyButton")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground md:text-right">
          {t("shareCodeHint", { facilityLabel: facilityLabel.toLowerCase() })}
        </p>
        <Button
          size="sm"
          onClick={onInvite}
          disabled={!canInvite}
          className="w-full md:w-auto"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {t("inviteButton")}
        </Button>
      </div>
    </CardHeader>
  );
};
