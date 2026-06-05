export function buildCurrentUserForAppointment(
  user:
    | { id: string; clinicId?: string | null; role: string }
    | null
    | undefined,
): { id: string; clinicId: string; role: string } | undefined {
  if (!user) return undefined;
  return { id: user.id, clinicId: user.clinicId ?? "", role: user.role };
}
