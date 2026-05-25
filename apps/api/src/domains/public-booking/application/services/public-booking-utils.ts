import { NotFoundException } from '@nestjs/common';
import type { PublicBookingClinicResponse } from '@workspace/types';
import { type PublicBookingPersistencePort } from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { runWithTenant } from '@/shared/common/middleware/tenant.middleware';
import { isRecord } from '@workspace/utils';

export type ResolvedPublicBookingClinic = PublicBookingClinicResponse;

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
}

function readFacilityLabelFromSettings(
  settings: unknown,
): 'CLINIC' | 'HOSPITAL' | undefined {
  if (!isRecord(settings)) {
    return undefined;
  }
  const raw = settings.facilityLabel;
  return raw === 'HOSPITAL' || raw === 'CLINIC' ? raw : undefined;
}

export async function resolveClinicByReferralCode(
  persistence: PublicBookingPersistencePort,
  referralCode: string,
): Promise<PublicBookingClinicResponse> {
  const normalized = referralCode.trim().toUpperCase();
  const clinic = await persistence.clinic.findFirst({
    where: {
      referralCode: normalized,
      active: true,
    },
    select: {
      id: true,
      name: true,
      referralCode: true,
      timezone: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      settings: true,
    },
  });
  if (!clinic?.referralCode) {
    throw new NotFoundException('Clinic not found');
  }
  return {
    id: clinic.id,
    name: clinic.name,
    referralCode: clinic.referralCode,
    timezone: clinic.timezone,
    address: clinic.address,
    phone: clinic.phone,
    email: clinic.email,
    website: clinic.website ?? undefined,
    facilityLabel: readFacilityLabelFromSettings(clinic.settings),
  };
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m?.[1] ?? null;
}

export async function withBookingTenant<T>(
  persistence: PublicBookingPersistencePort,
  referralCode: string,
  fn: (clinic: ResolvedPublicBookingClinic) => Promise<T>,
): Promise<T> {
  const clinic = await resolveClinicByReferralCode(persistence, referralCode);
  return await runWithTenant({ clinicId: clinic.id }, async () => fn(clinic));
}
