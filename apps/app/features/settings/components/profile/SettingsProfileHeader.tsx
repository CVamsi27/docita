"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { useAuth } from "@/lib/auth-context";
import { useClinic } from "@/lib/clinic-context";

const ROLE_LABELS: Record<string, string> = {
  ADMIN_DOCTOR: "Admin Doctor",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  ADMIN: "Admin",
  RECEPTIONIST: "Receptionist",
  INTERNAL: "Internal",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SettingsProfileHeader() {
  const { user } = useAuth();
  const { clinic } = useClinic();

  if (!user) return null;

  const initials = user.name ? getInitials(user.name) : "?";
  const roleLabel = user.role ? (ROLE_LABELS[user.role] ?? user.role) : null;

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card px-5 py-4">
      <Avatar className="h-12 w-12">
        <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground truncate">
          {user.name ?? "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {roleLabel && (
          <Badge variant="secondary" className="text-xs">
            {roleLabel}
          </Badge>
        )}
        {clinic?.name && (
          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
            {clinic.name}
          </span>
        )}
      </div>
    </div>
  );
}
