"use client";

import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import type { TeamMember } from "@/features/onboarding/components/types";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  OnboardingStepBody,
  OnboardingStepCard,
  OnboardingStepFooter,
  OnboardingStepHeader,
} from "@/features/onboarding/components/shared";
import {
  type TeamInviteStepProps,
  ROLE_OPTIONS,
  createEmptyMember,
  isDoctorRole,
} from "./team-invite-step-constants";
import { TeamMemberRow } from "./TeamMemberRow";

export function TeamInviteStep({
  onComplete,
  onSkip,
  onBack,
  maxMembers = 5,
  ownerName,
  ownerEmail,
  ownerRole = "ADMIN",
}: TeamInviteStepProps) {
  const [members, setMembers] = useState<TeamMember[]>([createEmptyMember()]);
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});

  const hasRowContent = (member: TeamMember) =>
    member.email.trim() !== "" ||
    (member.name?.trim() ?? "") !== "" ||
    (member.password?.trim() ?? "") !== "" ||
    (member.phoneNumber?.trim() ?? "") !== "" ||
    (member.specialization?.trim() ?? "") !== "" ||
    (member.qualification?.trim() ?? "") !== "" ||
    (member.registrationNumber?.trim() ?? "") !== "";

  const getMemberIssue = (member: TeamMember, index: number) => {
    if (!hasRowContent(member)) return null;
    if (!member.name?.trim()) return "Enter the member's name";
    if (!member.email.trim()) return "Enter the member's email";
    if (!member.email.includes("@")) return "Enter a valid email address";
    if (emailErrors[index]) return emailErrors[index];
    if (!member.password?.trim() || member.password.trim().length < 8) {
      return "Use a temporary password with at least 8 characters";
    }
    if (isDoctorRole(member.role) && !member.registrationNumber?.trim()) {
      return "Enter the medical registration number";
    }
    return null;
  };

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
      if (getMemberIssue(member, index) || !hasRowContent(member)) return [];
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
    (member, index) => !getMemberIssue(member, index) && hasRowContent(member),
  );

  const hasValidMembers = validMembers.length > 0;

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
        <div className="ui-panel-muted p-4 space-y-2">
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

        <div className="space-y-4">
          {members.map((member, index) => (
            <TeamMemberRow
              key={index}
              member={member}
              index={index}
              emailError={emailErrors[index]}
              hasRowContent={hasRowContent}
              getMemberIssue={getMemberIssue}
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

        {validMembers.length > 0 && (
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
        )}
      </OnboardingStepBody>
      <OnboardingStepFooter
        back={
          onBack ? { label: "Back to visit hours", onClick: onBack } : undefined
        }
        skip={{ label: "Skip for now", onClick: onSkip }}
        primary={{
          label: hasValidMembers ? "Save team & continue" : "Continue to plan",
          onClick: handleSubmit,
          disabled: !hasValidMembers,
        }}
      />
    </OnboardingStepCard>
  );
}
