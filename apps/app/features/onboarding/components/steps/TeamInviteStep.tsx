"use client";

import { useState } from "react";
import { Info, Plus, Trash2, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

interface TeamMember {
  email: string;
  role: "DOCTOR" | "NURSE" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  name?: string;
}

interface TeamInviteStepProps {
  onComplete: (members: TeamMember[]) => void;
  onSkip: () => void;
  maxMembers?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerRole?: "ADMIN" | "ADMIN_DOCTOR";
}

const ROLE_OPTIONS = [
  {
    value: "DOCTOR",
    label: "Doctor",
    description: "Can manage consultations, notes, and clinical workflows",
  },
  {
    value: "NURSE",
    label: "Nurse",
    description: "Can support patient care, review charts, and record vitals",
  },
  {
    value: "RECEPTIONIST",
    label: "Receptionist",
    description: "Can handle appointments, front desk, and patient check-in",
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Can manage clinic operations, members, and billing settings",
  },
  {
    value: "ADMIN_DOCTOR",
    label: "Admin Doctor",
    description:
      "Doctor with admin access who can help manage members and permissions",
  },
];

export function TeamInviteStep({
  onComplete,
  onSkip,
  maxMembers = 5,
  ownerName,
  ownerEmail,
  ownerRole = "ADMIN",
}: TeamInviteStepProps) {
  const [members, setMembers] = useState<TeamMember[]>([
    { email: "", role: "DOCTOR", name: "" },
  ]);
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});

  const hasRowContent = (member: TeamMember) =>
    member.email.trim() !== "" || (member.name?.trim() ?? "") !== "";

  const addMember = () => {
    if (members.length < maxMembers) {
      setMembers([...members, { email: "", role: "DOCTOR", name: "" }]);
    }
  };

  const removeMember = (index: number) => {
    const member = members[index];
    if (!member) return;

    if (hasRowContent(member)) {
      const updated = [...members];
      updated[index] = { ...updated[index], email: "", name: "" };
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
    const validMembers = members.filter(
      (m) =>
        m.email.trim() !== "" &&
        m.email.includes("@") &&
        !emailErrors[members.indexOf(m)],
    );
    onComplete(validMembers);
  };

  const hasValidMembers = members.some(
    (m) => m.email.trim() !== "" && m.email.includes("@"),
  );

  const validMembers = members.filter(
    (m) => m.email.trim() !== "" && m.email.includes("@"),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
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
        <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
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
            <div className="rounded-md border bg-background px-3 py-2">
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
            <div key={index} className={cn("grid gap-4 rounded-lg border p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Member {index + 1}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This member will be invited during onboarding
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMember(index)}
                  disabled={members.length === 1 && !hasRowContent(member)}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove member ${index + 1}`}
                  title={
                    hasRowContent(member)
                      ? "Clear member details"
                      : "Remove member"
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="grid grid-rows-[1.5rem_2.75rem_auto] gap-2">
                  <Label htmlFor={`email-${index}`} className="leading-6">
                    Email
                  </Label>
                  <Input
                    id={`email-${index}`}
                    type="email"
                    placeholder="Member email address"
                    value={member.email}
                    onChange={(e) =>
                      updateMember(index, "email", e.target.value)
                    }
                    className={cn(
                      "h-11 sm:h-11 rounded-xl",
                      emailErrors[index] && "border-destructive",
                    )}
                    aria-invalid={!!emailErrors[index]}
                  />
                  <div className="min-h-4">
                    {emailErrors[index] && (
                      <p className="text-xs text-destructive">
                        {emailErrors[index]}
                      </p>
                    )}
                  </div>
                </div>

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
                        <TooltipContent
                          side="top"
                          align="end"
                          className="max-w-[320px] p-3"
                        >
                          <p className="text-sm font-medium text-foreground">
                            Team roles and significance
                          </p>
                          <div className="mt-2 space-y-2">
                            {ROLE_OPTIONS.map((role) => (
                              <div key={role.value} className="space-y-0.5">
                                <p className="text-xs font-medium text-foreground">
                                  {role.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {role.description}
                                </p>
                              </div>
                            ))}
                          </div>
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
                      className="w-full rounded-xl px-4 h-11 sm:h-11 data-[size=default]:h-11 data-[size=default]:sm:h-11"
                    >
                      <SelectValue placeholder="Select role" />
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
                    {
                      ROLE_OPTIONS.find(
                        (option) => option.value === member.role,
                      )?.description
                    }
                  </p>
                </div>
              </div>
            </div>
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
