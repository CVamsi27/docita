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
import { cn } from "@workspace/ui/lib/utils";

interface TeamMember {
  email: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN_DOCTOR";
  name?: string;
}

interface TeamInviteStepProps {
  onComplete: (members: TeamMember[]) => void;
  onSkip: () => void;
  maxMembers?: number;
}

const ROLE_OPTIONS = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ADMIN_DOCTOR", label: "Admin Doctor" },
];

export function TeamInviteStep({
  onComplete,
  onSkip,
  maxMembers = 5,
}: TeamInviteStepProps) {
  const [members, setMembers] = useState<TeamMember[]>([
    { email: "", role: "DOCTOR", name: "" },
  ]);

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
  };

  const handleSubmit = () => {

    const validMembers = members.filter(
      (m) => m.email.trim() !== "" && m.email.includes("@"),
    );
    onComplete(validMembers);
  };

  const hasValidMembers = members.some(
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
            <CardTitle>Invite Team Members</CardTitle>
            <CardDescription>
              Add your staff to collaborate on the platform (optional)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {members.map((member, index) => (
            <div
              key={index}
              className={cn(
                "grid gap-4 p-4 rounded-lg border",
                "md:grid-cols-[1fr_1fr_auto]",
              )}
            >
              <div className="space-y-2">
                <Label htmlFor={`email-${index}`}>Email</Label>
                <Input
                  id={`email-${index}`}
                  type="email"
                  placeholder="colleague@clinic.com"
                  value={member.email}
                  onChange={(e) => updateMember(index, "email", e.target.value)}
                />
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
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMember(index)}
                  disabled={members.length === 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
            {hasValidMembers ? "Send Invites & Continue" : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
