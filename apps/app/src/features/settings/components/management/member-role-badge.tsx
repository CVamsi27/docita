import { useTranslation } from "react-i18next";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { memberRoleLabel } from "./member-role-label";

interface MemberRoleBadgeProps {
  role: string | null | undefined;
}

/**
 * Translated member-role badge. Binds the parent Settings namespace so
 * memberRoleLabel resolves Settings.roles.* (kept in its own file so the
 * t-prop trace attributes it to the Settings namespace, not TeamManagement).
 */
export function MemberRoleBadge({ role }: MemberRoleBadgeProps) {
  const { t } = useTranslation("Settings");
  return <Badge variant="outline">{memberRoleLabel(role, t)}</Badge>;
}
