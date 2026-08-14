/** Approved Meta CTA domain for patient-facing prescription / invoice / pay links. */
export const DOCITA_PUBLIC_LINK_ORIGIN = 'https://docita.work';

export function docitaPublicRxUrl(token: string): string {
  return `${DOCITA_PUBLIC_LINK_ORIGIN}/rx/${token}`;
}

export function docitaPublicInvoiceUrl(token: string): string {
  return `${DOCITA_PUBLIC_LINK_ORIGIN}/inv/${token}`;
}

export function docitaPublicPayUrl(token: string): string {
  return `${DOCITA_PUBLIC_LINK_ORIGIN}/pay/${token}`;
}

/**
 * Meta dynamic URL buttons accept only the path suffix (e.g. `abc123`), not a full URL.
 * Pass through bare tokens; otherwise use the last non-empty path segment.
 */
export function toWhatsAppUrlButtonToken(urlOrToken: string): string {
  const trimmed = urlOrToken.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.includes('://') && !trimmed.includes('/')) {
    return trimmed;
  }
  try {
    const segments = new URL(trimmed).pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? trimmed;
  } catch {
    const fallbackSegments = trimmed.split('/').filter(Boolean);
    return fallbackSegments[fallbackSegments.length - 1] ?? trimmed;
  }
}
