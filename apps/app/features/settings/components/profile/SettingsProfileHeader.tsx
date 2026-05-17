"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { SettingsAiChips } from "@/features/settings/components/settings-ai-chips";

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

/** Signed-in user strip for the settings page header (beside title on large screens). */
export function SettingsPageHeaderUserMeta() {
  const { user } = useAuth();

  if (!user) return null;

  const roleLabel = user.role ? (ROLE_LABELS[user.role] ?? user.role) : null;
  const displayName = user.name ?? "Unknown";
  const initials = displayName ? getInitials(displayName) : "?";

  return (
    <div
      className="ui-panel-muted flex w-fit max-w-full flex-row items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left shadow-sm ring-1 ring-border/50"
      aria-label={roleLabel ? `${displayName}, ${roleLabel}` : displayName}
    >
      <Avatar className="size-12 shrink-0 rounded-xl shadow-sm ring-1 ring-border/60">
        <AvatarFallback className="rounded-xl bg-muted/80 text-[var(--fs-sm)] font-semibold text-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <div className="flex w-full min-w-0 flex-row flex-nowrap items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[var(--fs-md)] font-semibold leading-tight tracking-tight text-foreground">
            {displayName}
          </span>
          {roleLabel ? (
            <Badge
              variant="secondary"
              className="h-6 shrink-0 truncate px-2.5 py-0 text-[var(--fs-2xs)] font-medium leading-none"
            >
              {roleLabel}
            </Badge>
          ) : null}
        </div>
        {user.email ? (
          <span className="w-full truncate text-[var(--fs-xs)] text-muted-foreground">
            {user.email}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsProfileHeader() {
  return <SettingsAiChips scope="doctor-profile" />;
}
