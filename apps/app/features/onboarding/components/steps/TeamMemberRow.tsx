import { Info, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  SymbolTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import type { TeamMember } from "@/features/onboarding/components/types";
import { ROLE_OPTIONS, isDoctorRole } from "./team-invite-step-constants";

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
              updateMember(index, "role", v as TeamMember["role"])
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

      {isDoctorRole(member.role) && (
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
      )}

      {getMemberIssue(member, index) && (
        <p className="text-xs text-destructive">
          {getMemberIssue(member, index)}
        </p>
      )}
    </div>
  );
}
