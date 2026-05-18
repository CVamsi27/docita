import { NotFoundException } from '@nestjs/common';
import type { PublicBookingClinicResponse } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { runWithTenant } from '@/shared/common/middleware/tenant.middleware';

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
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return undefined;
  }
  const raw = (settings as Record<string, unknown>).facilityLabel;
  return raw === 'HOSPITAL' || raw === 'CLINIC' ? raw : undefined;
}

export async function resolveClinicByReferralCode(
  prisma: PrismaService,
  referralCode: string,
): Promise<PublicBookingClinicResponse> {
  const normalized = referralCode.trim().toUpperCase();
  const clinic = await prisma.clinic.findFirst({
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
  prisma: PrismaService,
  referralCode: string,
  fn: (clinic: ResolvedPublicBookingClinic) => Promise<T>,
): Promise<T> {
  const clinic = await resolveClinicByReferralCode(prisma, referralCode);
  return await runWithTenant({ clinicId: clinic.id }, async () => fn(clinic));
}
