"use client";

import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import type { TeamMember } from "@/features/onboarding/components/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Step 3: Invite Team</CardTitle>
            <CardDescription>
              Add the first team members you want to invite now and refine
              permissions in Settings after setup
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="ui-panel-muted p-4 space-y-2">
          <p className="text-sm font-medium">Team guidance</p>
          <p className="text-xs text-muted-foreground">
            Your logged-in account is the clinic owner during onboarding. You
            selected
            <span className="font-medium">
              {" "}
              {ownerRole === "ADMIN_DOCTOR" ? "Admin Doctor" : "Admin"}
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
                  {ownerRole === "ADMIN_DOCTOR" ? "Admin Doctor" : "Admin"}
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
                      {ownerRole === "ADMIN_DOCTOR" ? "Admin Doctor" : "Admin"}
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

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!hasValidMembers}
            className="flex-1"
          >
            {hasValidMembers ? "Save team and continue" : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
