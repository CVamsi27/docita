import { randomBytes } from 'crypto';
import { Prisma } from '@workspace/db';
import { enterpriseBrandingSchema } from '@workspace/types';
import { isRecord } from '@workspace/utils';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';

export function toRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value));
}

export function parseEnterpriseBranding(branding: unknown) {
  const result = enterpriseBrandingSchema.safeParse(branding);
  return result.success ? result.data : undefined;
}

export function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return toPrismaInputJsonValue(toRecord(value));
}

export function readString(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
}

export function readStringArray(
  source: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = source[key];
  if (!Array.isArray(value)) return undefined;
  const normalized = value.filter(
    (item): item is string => typeof item === 'string',
  );
  return normalized.length > 0 ? normalized : [];
}

export function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = source[key];
  return typeof value === 'number' ? value : undefined;
}

export function readOptionalString(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readClinicSignatureUrl(clinic: {
  slaSignatureUrl?: string | null;
  settings?: unknown;
}): string | null {
  const settings = toRecord(clinic.settings);
  const sla = toRecord(settings.sla);

  const nestedStoredUrl = readOptionalString(sla, 'signatureStoredUrl');
  if (nestedStoredUrl) return nestedStoredUrl;

  const nestedSignatureUrl = readOptionalString(sla, 'signatureUrl');
  if (nestedSignatureUrl) return nestedSignatureUrl;

  return clinic.slaSignatureUrl ?? null;
}

export async function attachResolvedClinicSignatureUrl<
  T extends { slaSignatureUrl?: string | null; phoneNumber?: string },
>(
  clinic: T,
  storedFileUrlResolver: Pick<
    StoredFileUrlResolverService,
    'resolveWithStoredUrl'
  >,
): Promise<
  T & {
    slaSignatureUrl?: string | null;
    slaSignatureStoredUrl?: string | null;
  }
> {
  const rawSignatureUrl = readClinicSignatureUrl(clinic);
  const resolved =
    await storedFileUrlResolver.resolveWithStoredUrl(rawSignatureUrl);

  return {
    ...clinic,
    slaSignatureUrl: resolved.url ?? undefined,
    slaSignatureStoredUrl: resolved.storedUrl ?? undefined,
  };
}

export function generateReferralCode(clinicName: string): string {
  const prefix = clinicName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  // Math.random is unsuitable for referral codes — the suffix is what
  // makes a code unguessable. Use crypto.randomBytes and base32-style
  // alphabet (no 0/O/1/I) so the code is readable when shared.
  const suffix = randomReferralSuffix(4);
  return `${prefix}-${suffix}`;
}

const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomReferralSuffix(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length];
  }
  return out;
}
