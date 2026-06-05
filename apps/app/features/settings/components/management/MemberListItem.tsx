"use client";

import { isDoctor } from "@/lib/auth/permissions";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { User } from "@workspace/types";
import { memberRoleDisplayLabel } from "@/features/settings/components/management/member-management-schemas";

interface MemberListItemProps {
  member: User;
  onManage: (member: User) => void;
  getVerificationBadgeVariant: (
    status?: User["verificationStatus"],
  ) => "default" | "secondary" | "destructive" | "outline";
  getVerificationBadgeLabel: (status?: User["verificationStatus"]) => string;
}

export function MemberListItem({
  member,
  onManage,
  getVerificationBadgeVariant,
  getVerificationBadgeLabel,
}: MemberListItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 font-medium text-foreground">
          {member.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-medium">{member.name || "Unknown"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{member.email}</span>
            <Badge variant="outline">
              {memberRoleDisplayLabel(member.role)}
            </Badge>
            {isDoctor(member.role) && (
              <>
                <Badge
                  variant={getVerificationBadgeVariant(
                    member.verificationStatus,
                  )}
                >
                  {getVerificationBadgeLabel(member.verificationStatus)}
                </Badge>
                <Badge
                  variant={member.signatureUploadedAt ? "default" : "outline"}
                >
                  Signature {member.signatureUploadedAt ? "Ready" : "Missing"}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onManage(member)}>
        Manage
      </Button>
    </div>
  );
}
