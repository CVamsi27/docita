"use client";

import { UserPlus } from "lucide-react";
import { OnboardingStepBody, OnboardingStepCard, OnboardingStepHeader } from "@/features/onboarding/components/shared";
import { type TeamInviteStepProps } from "./team-invite-step-constants";
import { TeamGuidanceSection, MemberSummarySection, TeamInviteStepFooterSection } from "./TeamInviteStepSections";
import { TeamMembersList } from "./TeamMembersList";
import { useTeamInviteMembers } from "./use-team-invite-members";

export function TeamInviteStep({
  onComplete,
  onSkip,
  onBack,
  maxMembers = 5,
  ownerName,
  ownerEmail,
  ownerRole = "ADMIN",
}: TeamInviteStepProps) {
  const {
    members,
    emailErrors,
    addMember,
    removeMember,
    updateMember,
    handleSubmit,
    validMembers,
    hasValidMembers,
  } = useTeamInviteMembers({ onComplete, maxMembers, ownerEmail });

  return (
    <OnboardingStepCard>
      <OnboardingStepHeader
        stepNumber={3}
        eyebrow="Invite team"
        icon={<UserPlus strokeWidth={1.5} />}
        title="Invite your team"
        description="Add the first team members you want to invite now. We will suggest a plan on the next step based on your team size."
      />
      <OnboardingStepBody className="space-y-6">
        <TeamGuidanceSection
          ownerName={ownerName}
          ownerEmail={ownerEmail}
          ownerRole={ownerRole}
        />

        <TeamMembersList
          members={members}
          emailErrors={emailErrors}
          maxMembers={maxMembers}
          updateMember={updateMember}
          removeMember={removeMember}
          addMember={addMember}
        />

        <MemberSummarySection
          validMembers={validMembers}
          ownerEmail={ownerEmail}
          ownerRole={ownerRole}
        />
      </OnboardingStepBody>
      <TeamInviteStepFooterSection
        onBack={onBack}
        onSkip={onSkip}
        onSubmit={handleSubmit}
        hasValidMembers={hasValidMembers}
      />
    </OnboardingStepCard>
  );
}
