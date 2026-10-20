/** Mask a phone number to its last 4 digits for safe logging. */
export function truncatePhone(phone: string | undefined): string {
  if (!phone) return '<unset>';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}
