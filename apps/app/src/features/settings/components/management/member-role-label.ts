/** Resolve a member role to a translated label (Settings.roles). */
export function memberRoleLabel(
  role: string | null | undefined,
  t: (key: string) => string,
): string {
  switch (role) {
    case "DOCTOR":
      return t("roles.doctor");
    case "NURSE":
      return t("roles.nurse");
    case "RECEPTIONIST":
      return t("roles.receptionist");
    case "ADMIN":
      return t("roles.admin");
    case "ADMIN_DOCTOR":
      return t("roles.adminDoctor");
    case "LAB":
      return t("roles.lab");
    case "INTERNAL":
      return t("roles.internal");
    default:
      return role || t("roles.staff");
  }
}
