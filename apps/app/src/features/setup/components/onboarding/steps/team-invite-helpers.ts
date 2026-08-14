import type { TeamMember } from "@/features/setup/components/onboarding/types";
import { isDoctorRole } from "./team-invite-step-constants";

export function hasRowContent(member: TeamMember): boolean {
  return (
    member.email.trim() !== "" ||
    (member.name?.trim() ?? "") !== "" ||
    (member.password?.trim() ?? "") !== "" ||
    (member.phoneNumber?.trim() ?? "") !== "" ||
    (member.specialization?.trim() ?? "") !== "" ||
    (member.qualification?.trim() ?? "") !== "" ||
    (member.registrationNumber?.trim() ?? "") !== ""
  );
}

export function getMemberIssue(
  member: TeamMember,
  index: number,
  emailErrors: Record<number, string>,
): string | null {
  if (!hasRowContent(member)) return null;
  if (!member.name?.trim()) return "Enter the member's name";
  if (!member.email.trim()) return "Enter the member's email";
  if (!member.email.includes("@")) return "Enter a valid email address";
  if (emailErrors[index]) return emailErrors[index];
  if (!member.password?.trim() || member.password.trim().length < 8) {
    return "Use a temporary password with at least 8 characters";
  }
  if (isDoctorRole(member.role) && !member.registrationNumber?.trim()) {
    return "Enter the medical registration number";
  }
  return null;
}
