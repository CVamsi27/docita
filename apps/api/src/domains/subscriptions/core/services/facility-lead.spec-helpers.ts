import { jest } from '@jest/globals';
import type { IClock } from '@/shared/common/ports/clock.port';

export function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    referrerId: 'r1',
    referrer: { id: 'r1', name: 'Priya Partner' },
    status: 'SUBMITTED',
    facilityName: 'Sunrise Diagnostics',
    facilityType: 'DIAGNOSTIC_CENTRE',
    address: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    mapsUrl: null,
    contactName: 'Dr Anil',
    contactRole: 'Owner',
    contactPhone: '+919812345678',
    contactEmail: null,
    sourceNote: null,
    preferredChannel: 'WHATSAPP',
    consentToFollowUp: true,
    notes: null,
    bestTimeToContact: null,
    idempotencyKey: null,
    statusHistory: null,
    createdAt: new Date('2026-08-15T10:00:00Z'),
    updatedAt: new Date('2026-08-15T10:00:00Z'),
    ...overrides,
  };
}

export function makeFacilityLeadCtx() {
  const facilityLead = {
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    updateMany: jest.fn<(...a: unknown[]) => Promise<{ count: number }>>(),
  };
  const prisma = { facilityLead } as never;
  const clock: IClock = { now: () => new Date('2026-08-15T12:00:00Z') };
  return { prisma, facilityLead, clock };
}
