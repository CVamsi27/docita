"use client";

import type { TeamMember } from "@/features/setup/components/onboarding/types";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { OnboardingStepFooter } from "@/features/setup/components/onboarding/shared";
import { ROLE_OPTIONS } from "./team-invite-step-constants";

interface TeamGuidanceSectionProps {
  ownerName?: string;
  ownerEmail?: string;
  ownerRole: string;
}

export function TeamGuidanceSection({
  ownerName,
  ownerEmail,
  ownerRole,
}: TeamGuidanceSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Team guidance</p>
      <p className="text-xs text-muted-foreground">
        Your logged-in account is the clinic owner during onboarding. You
        selected
        <span className="font-medium">
          {" "}
          {ownerRole === "ADMIN_DOCTOR" ? "Admin doctor" : "Admin"}
        </span>
        , and you can add more members now and update permissions later in
        Settings
      </p>
      {(ownerName || ownerEmail) && (
        <div className="rounded-[var(--radius)] border border-border/70 bg-background/70 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Clinic Owner (already added)
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {ownerName || "Owner"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ownerEmail || ""}
              </p>
            </div>
            <Badge variant="outline">
              {ownerRole === "ADMIN_DOCTOR" ? "Admin doctor" : "Admin"}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

interface MemberSummarySectionProps {
  validMembers: TeamMember[];
  ownerEmail?: string;
  ownerRole: string;
}

export function MemberSummarySection({
  validMembers,
  ownerEmail,
  ownerRole,
}: MemberSummarySectionProps) {
  if (validMembers.length === 0) return null;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Members to be added</h4>
        <Badge variant="secondary">
          {validMembers.length + (ownerEmail ? 1 : 0)}
        </Badge>
      </div>
      <div className="space-y-2">
        {ownerEmail && (
          <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 opacity-90">
            <span className="text-sm text-foreground">{ownerEmail}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {ownerRole === "ADMIN_DOCTOR" ? "Admin doctor" : "Admin"}
              </Badge>
              <Badge variant="secondary">Owner</Badge>
            </div>
          </div>
        )}
        {validMembers.map((member) => (
          <div
            key={`${member.email}-${member.role}`}
            className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2"
          >
            <span className="text-sm text-foreground">
              {member.email}
            </span>
            <Badge variant="outline">
              {
                ROLE_OPTIONS.find(
                  (option) => option.value === member.role,
                )?.label
              }
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TeamInviteStepFooterSectionProps {
  onBack?: () => void;
  onSkip: () => void;
  onSubmit: () => void;
  hasValidMembers: boolean;
}

/** Step-navigation footer for the team-invite step: back/skip/primary actions. */
export function TeamInviteStepFooterSection({
  onBack,
  onSkip,
  onSubmit,
  hasValidMembers,
}: TeamInviteStepFooterSectionProps) {
  return (
    <OnboardingStepFooter
      back={onBack ? { label: "Back to visit hours", onClick: onBack } : undefined}
      skip={{ label: "Skip for now", onClick: onSkip }}
      primary={{
        label: hasValidMembers ? "Save team & continue" : "Continue to plan",
        onClick: onSubmit,
        disabled: !hasValidMembers,
      }}
    />
  );
}
