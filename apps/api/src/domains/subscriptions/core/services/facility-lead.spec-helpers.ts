// check-as-cast-density: allow-file — test double for the persistence port
// (service constructor accepts the port, not this fixture).
import { jest } from '@jest/globals';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';

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
    ownerUserId: null,
    ownerUser: null,
    assignmentHistory: null,
    fingerprint: null,
    duplicateScore: null,
    duplicateOfId: null,
    duplicateOf: null,
    createdAt: new Date('2026-08-15T10:00:00Z'),
    updatedAt: new Date('2026-08-15T10:00:00Z'),
    ...overrides,
  };
}

export function notificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    leadId: 'l1',
    kind: 'LEAD_CREATED',
    channel: 'internal',
    status: 'DELIVERED',
    recipientUserId: null,
    payload: {
      leadId: 'l1',
      facilityName: 'Sunrise Diagnostics',
      city: 'Bengaluru',
      state: 'Karnataka',
      partnerName: 'Priya Partner',
      consentToFollowUp: true,
      duplicateScore: null,
      deepLink: '/leads',
    },
    errorMessage: null,
    deliveredAt: new Date('2026-08-15T12:00:00Z'),
    createdAt: new Date('2026-08-15T12:00:00Z'),
    ...overrides,
  };
}

/**
 * Persistence-port double. `$transaction` runs the callback against the
 * same delegate mocks (the interactive-tx delegates are the mocked ones),
 * and `outbox` is the IOutboxService double injected by the command service.
 */
export function makeFacilityLeadCtx() {
  const facilityLead = {
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    updateMany: jest.fn<(...a: unknown[]) => Promise<{ count: number }>>(),
  };
  const facilityLeadNotification = {
    upsert: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    updateMany: jest.fn<(...a: unknown[]) => Promise<{ count: number }>>(),
  };
  const user = {
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const prisma = {
    facilityLead,
    facilityLeadNotification,
    user,
    $transaction: jest.fn(
      async <T>(fn: (tx: Record<string, unknown>) => Promise<T>): Promise<T> =>
        fn({ facilityLead, facilityLeadNotification } as never),
    ),
  } as never;
  const outbox: IOutboxService = { append: jest.fn<() => Promise<void>>() };
  const clock: IClock = { now: () => new Date('2026-08-15T12:00:00Z') };
  return {
    prisma,
    facilityLead,
    facilityLeadNotification,
    user,
    outbox,
    clock,
  };
}
