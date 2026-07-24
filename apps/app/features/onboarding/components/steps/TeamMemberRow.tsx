import { cn } from "@workspace/ui/lib/utils";
import type { TeamMember } from "@/features/onboarding/components/types";
import {
  isDoctorRole,
} from "./team-invite-step-constants";
import { TeamMemberRowHeader, TeamMemberNameEmailFields, TeamMemberPhonePasswordFields, TeamMemberRoleSection, TeamMemberDoctorFields, TeamMemberIssueMessage } from "./TeamMemberRowSections";

interface TeamMemberRowProps {
  member: TeamMember;
  index: number;
  emailError?: string;
  hasRowContent: (member: TeamMember) => boolean;
  getMemberIssue: (member: TeamMember, index: number) => string | null;
  updateMember: (index: number, field: keyof TeamMember, value: string) => void;
  removeMember: (index: number) => void;
  membersCount: number;
}

export function TeamMemberRow({
  member,
  index,
  emailError,
  hasRowContent,
  getMemberIssue,
  updateMember,
  removeMember,
  membersCount,
}: TeamMemberRowProps) {
  return (
    <div className={cn("grid gap-4 rounded-[var(--radius)] border border-border/70 p-4")}>
      <TeamMemberRowHeader
        member={member}
        index={index}
        hasRowContent={hasRowContent}
        removeMember={removeMember}
        membersCount={membersCount}
      />

      <TeamMemberNameEmailFields
        member={member}
        index={index}
        emailError={emailError}
        updateMember={updateMember}
      />

      <TeamMemberPhonePasswordFields
        member={member}
        index={index}
        updateMember={updateMember}
      />

      <TeamMemberRoleSection
        member={member}
        index={index}
        updateMember={updateMember}
      />

      {isDoctorRole(member.role) && (
        <TeamMemberDoctorFields
          member={member}
          index={index}
          updateMember={updateMember}
        />
      )}

      <TeamMemberIssueMessage
        member={member}
        index={index}
        getMemberIssue={getMemberIssue}
      />
    </div>
  );
}
