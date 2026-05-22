export function readRazorpayNoteString(
  notes: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = notes?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function readRazorpayClinicId(
  notes: Record<string, unknown> | undefined,
): string | undefined {
  return (
    readRazorpayNoteString(notes, 'clinic_id') ??
    readRazorpayNoteString(notes, 'clinicId')
  );
}
