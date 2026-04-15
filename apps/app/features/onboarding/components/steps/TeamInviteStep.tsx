"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
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
import { cn } from "@workspace/ui/lib/utils";

interface TeamMember {
  email: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
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
    description: "Doctor with admin access who can help manage members and permissions",
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

  const addMember = () => {
    if (members.length < maxMembers) {
      setMembers([...members, { email: "", role: "DOCTOR", name: "" }]);
    }
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
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
          (m, i) => i !== index && m.email.toLowerCase() === value.toLowerCase(),
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
      (m) => m.email.trim() !== "" && m.email.includes("@") && !emailErrors[members.indexOf(m)],
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
            <CardTitle>Step 3: Team Planning</CardTitle>
            <CardDescription>
              Add your initial team plan. You can finalize member accounts and permissions in Settings after setup.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
          <p className="text-sm font-medium">Role Guidance</p>
          <p className="text-xs text-muted-foreground">
            Your logged-in account is the clinic owner during onboarding. You
            selected:
            <span className="font-medium"> {ownerRole === "ADMIN_DOCTOR" ? "Admin Doctor" : "Admin"}</span>.
            You can add more members now and update permissions later in
            Settings.
          </p>
          {(ownerName || ownerEmail) && (
            <div className="rounded-md border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Clinic Owner (already added)</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{ownerName || "Owner"}</p>
                  <p className="text-xs text-muted-foreground">{ownerEmail || ""}</p>
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
            <div
              key={index}
              className={cn(
                "relative grid gap-4 rounded-lg border p-4",
                "md:grid-cols-2",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMember(index)}
                disabled={members.length === 1}
                className="absolute right-2 top-2 h-9 w-9 text-muted-foreground hover:text-destructive"
                aria-label="Remove member"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <div className="space-y-2">
                <Label htmlFor={`email-${index}`}>Email</Label>
                <Input
                  id={`email-${index}`}
                  type="email"
                  placeholder="Enter member email address"
                  value={member.email}
                  onChange={(e) => updateMember(index, "email", e.target.value)}
                  className={emailErrors[index] ? "border-destructive" : ""}
                  aria-invalid={!!emailErrors[index]}
                />
                {emailErrors[index] && (
                  <p className="text-xs text-destructive">{emailErrors[index]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`role-${index}`}>Role</Label>
                <Select
                  value={member.role}
                  onValueChange={(v) =>
                    updateMember(index, "role", v as TeamMember["role"])
                  }
                >
                  <SelectTrigger id={`role-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    ROLE_OPTIONS.find((option) => option.value === member.role)
                      ?.description
                  }
                </p>
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
            Add Another Member
          </Button>
        )}

        {validMembers.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Members To Be Added</h4>
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
                  <span className="text-sm text-foreground">{member.email}</span>
                  <Badge variant="outline">
                    {
                      ROLE_OPTIONS.find((option) => option.value === member.role)
                        ?.label
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
            Skip for Now
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!hasValidMembers}
            className="flex-1"
          >
            {hasValidMembers ? "Save Team Plan and Continue" : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
