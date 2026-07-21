"use client";

// jscpd:ignore-start
import { Info, Trash2 } from "lucide-react";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives"
import { Button, Label } from "@workspace/ui/components";
import {
  SymbolTooltip,
// jscpd:ignore-end
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import type { TeamMember } from "@/features/onboarding/components/types";
import {
  ROLE_OPTIONS,
  isDoctorRole,
  parseTeamMemberRole,
} from "./team-invite-step-constants";

export interface TeamMemberRowHeaderProps {
  member: TeamMember;
  index: number;
  hasRowContent: (member: TeamMember) => boolean;
  removeMember: (index: number) => void;
  membersCount: number;
}

export function TeamMemberRowHeader({
  member,
  index,
  hasRowContent,
  removeMember,
  membersCount,
}: TeamMemberRowHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Member {index + 1}
        </p>
        <p className="text-xs text-muted-foreground">
          This member will be invited during onboarding
        </p>
      </div>
      <SymbolTooltip
        label={
          hasRowContent(member)
            ? "Clear member details"
            : "Remove member"
        }
        side="left"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeMember(index)}
          disabled={membersCount === 1 && !hasRowContent(member)}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove member ${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </SymbolTooltip>
    </div>
  );
}

export interface TeamMemberNameEmailFieldsProps {
  member: TeamMember;
  index: number;
  emailError?: string;
  updateMember: (index: number, field: keyof TeamMember, value: string) => void;
}

export function TeamMemberNameEmailFields({
  member,
  index,
  emailError,
  updateMember,
}: TeamMemberNameEmailFieldsProps) {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
        <Label htmlFor={`name-${index}`} className="leading-6">
          Name
        </Label>
        <Input
          id={`name-${index}`}
          placeholder="Full name"
          value={member.name ?? ""}
          onChange={(e) => updateMember(index, "name", e.target.value)}
          className="h-11 sm:h-11"
        />
        <div className="min-h-4" />
      </div>

      <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
        <Label htmlFor={`email-${index}`} className="leading-6">
          Email
        </Label>
        <Input
          id={`email-${index}`}
          type="email"
          placeholder="Email"
          value={member.email}
          onChange={(e) => updateMember(index, "email", e.target.value)}
          className={cn(
            "h-11 sm:h-11 rounded-lg",
            emailError && "border-destructive",
          )}
          aria-invalid={!!emailError}
        />
        <div className="min-h-4">
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// jscpd:ignore-start
export interface TeamMemberPhonePasswordFieldsProps {
  member: TeamMember;
  index: number;
  updateMember: (index: number, field: keyof TeamMember, value: string) => void;
}

export function TeamMemberPhonePasswordFields({
  member,
  index,
  updateMember,
}: TeamMemberPhonePasswordFieldsProps) {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
        <Label htmlFor={`phone-${index}`} className="leading-6">
          Phone
        </Label>
        <Input
          id={`phone-${index}`}
          placeholder="Phone number"
          value={member.phoneNumber ?? ""}
          onChange={(e) => updateMember(index, "phoneNumber", e.target.value)}
          className="h-11 rounded-lg sm:h-11"
        />
        <div className="min-h-4" />
      </div>

      <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
        <Label htmlFor={`password-${index}`} className="leading-6">
          Temporary Password
        </Label>
        <Input
          id={`password-${index}`}
          type="password"
          placeholder="Enter password"
          value={member.password ?? ""}
          onChange={(e) => updateMember(index, "password", e.target.value)}
          className="h-11 rounded-lg sm:h-11"
        />
        <div className="min-h-4" />
      </div>
    </div>
  );
}
// jscpd:ignore-end

export interface TeamMemberRoleSectionProps {
  member: TeamMember;
  index: number;
  updateMember: (index: number, field: keyof TeamMember, value: string) => void;
}

export function TeamMemberRoleSection({
  member,
  index,
  updateMember,
}: TeamMemberRoleSectionProps) {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <div className="group/role relative grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
        <div className="flex items-center justify-between leading-6">
          <Label htmlFor={`role-${index}`} className="leading-6">
            Role
          </Label>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Role significance guide"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 opacity-0 transition-opacity group-hover/role:opacity-100 focus-visible:opacity-100 hover:text-foreground focus-visible:outline-none"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="end" className="p-2">
                <p>Role</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select
          value={member.role}
          onValueChange={(v) =>
            updateMember(index, "role", parseTeamMemberRole(v))
          }
        >
          <SelectTrigger
            id={`role-${index}`}
            className="w-full rounded-lg px-4 h-11 sm:h-11 data-[size=default]:h-11 data-[size=default]:sm:h-11"
          >
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground min-h-4">
          {ROLE_OPTIONS.find((option) => option.value === member.role)?.description}
        </p>
      </div>

      {isDoctorRole(member.role) && (
        <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
          <Label htmlFor={`registrationNumber-${index}`} className="leading-6">
            Registration #
          </Label>
          <Input
            id={`registrationNumber-${index}`}
            placeholder="Registration number"
            value={member.registrationNumber ?? ""}
            onChange={(e) =>
              updateMember(index, "registrationNumber", e.target.value)
            }
            className="h-11 rounded-lg sm:h-11"
          />
          <div className="min-h-4" />
        </div>
      )}
    </div>
  );
}

// jscpd:ignore-start
export interface TeamMemberDoctorFieldsProps {
  member: TeamMember;
  index: number;
  updateMember: (index: number, field: keyof TeamMember, value: string) => void;
}

export function TeamMemberDoctorFields({
  member,
  index,
  updateMember,
}: TeamMemberDoctorFieldsProps) {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
        <Label htmlFor={`specialization-${index}`} className="leading-6">
          Specialization
        </Label>
        <Input
          id={`specialization-${index}`}
          placeholder="Cardiology"
          value={member.specialization ?? ""}
          onChange={(e) =>
            updateMember(index, "specialization", e.target.value)
          }
          className="h-11 rounded-lg sm:h-11"
        />
        <div className="min-h-4" />
      </div>

      <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
        <Label htmlFor={`qualification-${index}`} className="leading-6">
          Qualification
        </Label>
        <Input
          id={`qualification-${index}`}
          placeholder="Qualification"
          value={member.qualification ?? ""}
          onChange={(e) =>
            updateMember(index, "qualification", e.target.value)
          }
          className="h-11 rounded-lg sm:h-11"
        />
        <div className="min-h-4" />
      </div>
    </div>
  );
}
// jscpd:ignore-end

export interface TeamMemberIssueMessageProps {
  member: TeamMember;
  index: number;
  getMemberIssue: (member: TeamMember, index: number) => string | null;
}

export function TeamMemberIssueMessage({
  member,
  index,
  getMemberIssue,
}: TeamMemberIssueMessageProps) {
  const issue = getMemberIssue(member, index);
  if (!issue) return null;

  return <p className="text-xs text-destructive">{issue}</p>;
}
