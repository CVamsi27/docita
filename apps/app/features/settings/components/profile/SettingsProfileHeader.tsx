"use client";

import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/indicators/avatar";
import { Badge } from "@workspace/ui/components/indicators/badge";
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
      className="flex w-full max-w-full flex-row items-center gap-3.5 rounded-[var(--radius)] border border-border/60 bg-card px-4 py-3 text-left shadow-sm sm:w-fit lg:max-w-[24rem] lg:justify-self-end"
      aria-label={roleLabel ? `${displayName}, ${roleLabel}` : displayName}
    >
      <Avatar className="size-11 shrink-0 rounded-[calc(var(--radius)-4px)] ring-1 ring-border/60">
        <AvatarFallback className="rounded-[calc(var(--radius)-4px)] bg-[var(--brand-ink)] text-[var(--fs-sm)] font-semibold text-[var(--brand-cyan)]">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <div className="flex w-full min-w-0 flex-row flex-wrap items-center gap-2 sm:flex-nowrap">
          <span className="min-w-0 flex-1 truncate text-[var(--fs-md)] font-semibold leading-tight tracking-tight text-foreground">
            {displayName}
          </span>
          {roleLabel ? (
            <Badge
              variant="secondary"
              className="ui-eyebrow h-5 shrink-0 truncate border border-border/60 bg-muted/40 px-2 py-0 leading-none text-muted-foreground"
            >
              {roleLabel}
            </Badge>
          ) : null}
        </div>
        {user.email ? (
          <span className="ui-mono w-full truncate text-[var(--fs-xs)] text-muted-foreground">
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
