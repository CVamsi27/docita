"use client";

import { useState } from "react";
import type { TeamMember } from "@/features/setup/components/onboarding/types";
import {
  createEmptyMember,
  isDoctorRole,
  type TeamInviteStepProps,
} from "./team-invite-step-constants";
import { hasRowContent, getMemberIssue } from "./team-invite-helpers";

interface UseTeamInviteMembersOptions {
  onComplete: TeamInviteStepProps["onComplete"];
  maxMembers: number;
  ownerEmail?: string;
}

/**
 * Owns the team-invite roster: row state, email-conflict validation, and the
 * add/remove/update/submit mutations — extracted from `TeamInviteStep` so the
 * component can stay a thin layout shell around `TeamMemberRow`.
 */
export function useTeamInviteMembers({
  onComplete,
  maxMembers,
  ownerEmail,
}: UseTeamInviteMembersOptions) {
  const [members, setMembers] = useState<TeamMember[]>([createEmptyMember()]);
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});

  const addMember = () => {
    if (members.length < maxMembers) {
      setMembers([...members, createEmptyMember()]);
    }
  };

  const removeMember = (index: number) => {
    const member = members[index];
    if (!member) return;

    if (hasRowContent(member)) {
      const updated = [...members];
      updated[index] = createEmptyMember();
      setMembers(updated);
      setEmailErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
      setEmailErrors((prev) => {
        const next: Record<number, string> = {};
        Object.entries(prev).forEach(([key, value]) => {
          const errorIndex = Number(key);
          if (errorIndex < index) next[errorIndex] = value;
          if (errorIndex > index) next[errorIndex - 1] = value;
        });
        return next;
      });
    }
  };

  const updateMember = (
    index: number,
    field: keyof TeamMember,
    value: string,
  ) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);

    if (field === "email") {
      const newErrors = { ...emailErrors };
      delete newErrors[index];

      if (value && value.includes("@")) {
        const isDuplicate = updated.some(
          (m, i) =>
            i !== index && m.email.toLowerCase() === value.toLowerCase(),
        );
        const isOwner = ownerEmail?.toLowerCase() === value.toLowerCase();

        if (isDuplicate) {
          newErrors[index] = "This email is already added";
        } else if (isOwner) {
          newErrors[index] = "This is the clinic owner's email";
        }
      }
      setEmailErrors(newErrors);
    }
  };

  const handleSubmit = () => {
    const validMembers = members.flatMap((member, index) => {
      if (getMemberIssue(member, index, emailErrors) || !hasRowContent(member))
        return [];
      return [
        {
          ...member,
          email: member.email.trim(),
          name: member.name?.trim(),
          password: member.password?.trim(),
          phoneNumber: member.phoneNumber?.trim() || undefined,
          specialization: isDoctorRole(member.role)
            ? member.specialization?.trim() || undefined
            : undefined,
          qualification: isDoctorRole(member.role)
            ? member.qualification?.trim() || undefined
            : undefined,
          registrationNumber: isDoctorRole(member.role)
            ? member.registrationNumber?.trim() || undefined
            : undefined,
        },
      ];
    });
    onComplete(validMembers);
  };

  const validMembers = members.filter(
    (member, index) =>
      !getMemberIssue(member, index, emailErrors) && hasRowContent(member),
  );

  return {
    members,
    emailErrors,
    addMember,
    removeMember,
    updateMember,
    handleSubmit,
    validMembers,
    hasValidMembers: validMembers.length > 0,
  };
}
