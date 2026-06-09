"use client";

import { Plus } from "lucide-react";
import type { TeamMember } from "@/features/onboarding/components/types";
import { Button } from "@workspace/ui/components/form/button";
import { TeamMemberRow } from "./TeamMemberRow";
import { hasRowContent, getMemberIssue } from "./TeamInviteStepSections";

export interface TeamMembersListProps {
  members: TeamMember[];
  emailErrors: Record<number, string>;
  maxMembers: number;
  updateMember: (index: number, field: keyof TeamMember, value: string) => void;
  removeMember: (index: number) => void;
  addMember: () => void;
}

/**
 * Roster of `TeamMemberRow`s plus the "add another member" affordance —
 * extracted from `TeamInviteStep` so the step component stays a thin layout
 * shell around the guidance/summary sections and footer.
 */
export function TeamMembersList({
  members,
  emailErrors,
  maxMembers,
  updateMember,
  removeMember,
  addMember,
}: TeamMembersListProps) {
  return (
    <>
      <div className="space-y-4">
        {members.map((member, index) => (
          <TeamMemberRow
            key={index}
            member={member}
            index={index}
            emailError={emailErrors[index]}
            hasRowContent={hasRowContent}
            getMemberIssue={(member, index) =>
              getMemberIssue(member, index, emailErrors)
            }
            updateMember={updateMember}
            removeMember={removeMember}
            membersCount={members.length}
          />
        ))}
      </div>

      {members.length < maxMembers && (
        <Button
          type="button"
          variant="outline"
          onClick={addMember}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add another member
        </Button>
      )}
    </>
  );
}
