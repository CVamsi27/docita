import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import assert from 'node:assert/strict';
import {
  appAuditLogSummarySchema,
  appComplianceSummarySchema,
  appDataSubjectRequestSchema,
} from '@workspace/types';
import { z } from 'zod';
import { ClinicSettingsQueryService } from './clinic-settings-query.service';
import { ClinicDataSubjectRequestService } from './clinic-data-subject-request.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import type { ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import type { PrismaService } from '@/prisma/prisma.service';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { AuditService as AuditServiceContract } from '@/shared/modules/audit/audit/audit.service';

const NOW = new Date('2026-07-04T10:00:00.000Z');
const CLINIC_ID = 'clinic-1';

/** The SPA receives JSON, not the in-process objects these services return. */
function overTheWire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

/**
 * Asserts that every key of `payload` is required by `schema`.
 *
 * Written as a loop rather than one hand-written case per field on purpose: a
 * mutation that flips a single field back to `.optional()` then fails here.
 * When only two of seven fields had a hand-written case, mutating the fifth
 * slipped through with the suite still green.
 */
function expectEveryKeyRequired(
  schema: z.ZodType<Record<string, unknown>>,
  payload: Record<string, unknown>,
): void {
  for (const key of Object.keys(payload)) {
    const { [key]: _dropped, ...rest } = payload;
    assert.ok(
      !schema.safeParse(rest).success,
      `expected "${key}" to be required by the schema`,
    );
  }
}

const dsrRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'dsr-1',
  clinicId: CLINIC_ID,
  patientId: 'patient-1',
  requestType: 'EXPORT',
  status: 'OPEN',
  requestedByName: 'Asha Rao',
  requestedByRelation: 'SELF',
  requestChannel: 'in_person',
  requestDetails: 'Copy of my record',
  dueAt: new Date('2026-08-03T10:00:00.000Z'),
  completedAt: null,
  handledById: null,
  handledAt: null,
  resolutionNotes: null,
  createdAt: new Date('2026-07-04T08:00:00.000Z'),
  updatedAt: new Date('2026-07-04T08:00:00.000Z'),
  ...overrides,
});

describe('compliance endpoint contract parity', () => {
  describe('GET /clinics/:id/compliance', () => {
    let service: ClinicSettingsQueryService;
    let prisma: jest.Mocked<ClinicPersistencePort>;

    beforeEach(() => {
      prisma = {
        clinic: { findUnique: jest.fn() },
        consentTemplate: { findFirst: jest.fn() },
        dataSubjectRequest: { groupBy: jest.fn(), findMany: jest.fn() },
      } as unknown as jest.Mocked<ClinicPersistencePort>;
      service = new ClinicSettingsQueryService(prisma);
    });

    it('parses the summary a signed clinic produces', async () => {
      (prisma.clinic.findUnique as jest.Mock).mockResolvedValueOnce({
        slaSignatureUrl: 'https://example.com/sla.pdf',
        slaSignatureAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
      } as never);
      (prisma.consentTemplate.findFirst as jest.Mock).mockResolvedValueOnce({
        updatedAt: new Date('2026-01-15T00:00:00.000Z'),
      } as never);
      (prisma.dataSubjectRequest.groupBy as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );

      const raw = await service.getComplianceSummary(CLINIC_ID);

      const parsed = appComplianceSummarySchema.parse(overTheWire(raw));
      expect(parsed).toEqual({
        slaSignatureUrl: 'https://example.com/sla.pdf',
        slaSignatureAcceptedAt: '2026-01-01T00:00:00.000Z',
        consentTemplateEnabled: true,
        consentTemplateUpdatedAt: '2026-01-15T00:00:00.000Z',
        withdrawalRequestsOpen: 0,
        dataExportRequestsOpen: 0,
        dataDeletionRequestsOpen: 0,
      });
    });

    it('parses the summary for a clinic that has never signed', async () => {
      // A missing clinic row is not an error here: the service still returns
      // every key with a null, and the schema requires the keys to be present.
      (prisma.clinic.findUnique as jest.Mock).mockResolvedValueOnce(
        null as never,
      );
      (prisma.consentTemplate.findFirst as jest.Mock).mockResolvedValueOnce(
        null as never,
      );
      (prisma.dataSubjectRequest.groupBy as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );

      const parsed = appComplianceSummarySchema.parse(
        overTheWire(await service.getComplianceSummary(CLINIC_ID)),
      );

      expect(parsed.slaSignatureUrl).toBeNull();
      expect(parsed.slaSignatureAcceptedAt).toBeNull();
      expect(parsed.consentTemplateEnabled).toBe(false);
    });

    it('parses the rolled-up open request counts', async () => {
      (prisma.clinic.findUnique as jest.Mock).mockResolvedValueOnce({
        slaSignatureUrl: null,
        slaSignatureAcceptedAt: null,
      } as never);
      (prisma.consentTemplate.findFirst as jest.Mock).mockResolvedValueOnce(
        null as never,
      );
      (prisma.dataSubjectRequest.groupBy as jest.Mock).mockResolvedValueOnce([
        { requestType: 'ACCESS', _count: { _all: 2 } },
        { requestType: 'EXPORT', _count: { _all: 3 } },
        { requestType: 'DELETION', _count: { _all: 1 } },
        { requestType: 'CONSENT_WITHDRAWAL', _count: { _all: 4 } },
      ] as never);

      const parsed = appComplianceSummarySchema.parse(
        overTheWire(await service.getComplianceSummary(CLINIC_ID)),
      );

      // ACCESS and EXPORT are both counted as "data export" for the operator.
      expect(parsed.dataExportRequestsOpen).toBe(5);
      expect(parsed.dataDeletionRequestsOpen).toBe(1);
      expect(parsed.withdrawalRequestsOpen).toBe(4);
    });

    it('refuses a summary that stopped reporting a required key', () => {
      const drifted = {
        slaSignatureUrl: null,
        slaSignatureAcceptedAt: null,
        consentTemplateEnabled: true,
        consentTemplateUpdatedAt: null,
        withdrawalRequestsOpen: 0,
        dataExportRequestsOpen: 0,
      };

      expect(appComplianceSummarySchema.safeParse(drifted).success).toBe(false);
    });

    it('treats every summary key as required', () => {
      expectEveryKeyRequired(appComplianceSummarySchema, {
        slaSignatureUrl: null,
        slaSignatureAcceptedAt: null,
        consentTemplateEnabled: false,
        consentTemplateUpdatedAt: null,
        withdrawalRequestsOpen: 0,
        dataExportRequestsOpen: 0,
        dataDeletionRequestsOpen: 0,
      });
    });
  });

  describe('GET /clinics/:id/data-subject-requests', () => {
    let service: ClinicSettingsQueryService;
    let prisma: jest.Mocked<ClinicPersistencePort>;

    beforeEach(() => {
      prisma = {
        clinic: { findUnique: jest.fn() },
        consentTemplate: { findFirst: jest.fn() },
        dataSubjectRequest: { groupBy: jest.fn(), findMany: jest.fn() },
      } as unknown as jest.Mocked<ClinicPersistencePort>;
      service = new ClinicSettingsQueryService(prisma);
    });

    it('parses the rows, whose timestamps are Dates in-process', async () => {
      (prisma.dataSubjectRequest.findMany as jest.Mock).mockResolvedValueOnce([
        dsrRow(),
      ] as never);

      const raw = await service.listDataSubjectRequests(CLINIC_ID);

      // In-process the rows carry real Dates; the schema has to accept both.
      expect(
        z.array(appDataSubjectRequestSchema).parse(raw)[0].dueAt,
      ).toBeInstanceOf(Date);

      const parsed = z
        .array(appDataSubjectRequestSchema)
        .parse(overTheWire(raw));
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        id: 'dsr-1',
        requestType: 'EXPORT',
        status: 'OPEN',
        dueAt: '2026-08-03T10:00:00.000Z',
        createdAt: '2026-07-04T08:00:00.000Z',
      });
      expect(parsed[0].completedAt).toBeNull();
    });

    it('refuses a row whose status is outside the enum', () => {
      expect(
        z
          .array(appDataSubjectRequestSchema)
          .safeParse([dsrRow({ status: 'ARCHIVED' })]).success,
      ).toBe(false);
    });

    it('refuses a row whose request type is outside the enum', () => {
      expect(
        z
          .array(appDataSubjectRequestSchema)
          .safeParse([dsrRow({ requestType: 'TELEPORT' })]).success,
      ).toBe(false);
    });

    it('refuses a row that lost a required key', () => {
      const drifted = dsrRow();
      delete (drifted as Record<string, unknown>).createdAt;

      expect(
        z.array(appDataSubjectRequestSchema).safeParse([drifted]).success,
      ).toBe(false);
    });

    it('treats both row timestamps as required', () => {
      // Only the required keys belong here: the nullable columns on a
      // DataSubjectRequest row are genuinely optional.
      expectEveryKeyRequired(appDataSubjectRequestSchema, {
        createdAt: new Date('2026-07-04T08:00:00.000Z'),
        updatedAt: new Date('2026-07-04T08:00:00.000Z'),
      });
    });
  });

  describe('POST and PATCH /clinics/:id/data-subject-requests', () => {
    let service: ClinicDataSubjectRequestService;
    let prisma: jest.Mocked<ClinicPersistencePort>;
    let logAction: jest.Mock;

    beforeEach(() => {
      prisma = {
        patient: { findFirst: jest.fn() },
        dataSubjectRequest: {
          create: jest.fn(),
          update: jest.fn(),
          findFirst: jest.fn(),
        },
      } as unknown as jest.Mocked<ClinicPersistencePort>;
      logAction = jest.fn(async () => undefined);
      const auditService = { logAction } as unknown as AuditServiceContract;
      const clock: IClock = { now: () => NOW };
      service = new ClinicDataSubjectRequestService(
        prisma,
        auditService,
        clock,
      );
    });

    it('parses the created request', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'patient-1',
      } as never);
      (prisma.dataSubjectRequest.create as jest.Mock).mockResolvedValueOnce(
        dsrRow() as never,
      );

      const created = await service.createDataSubjectRequest(
        CLINIC_ID,
        { requestType: 'EXPORT', patientId: 'patient-1' },
        'user-1',
      );

      const parsed = appDataSubjectRequestSchema.parse(overTheWire(created));
      expect(parsed.id).toBe('dsr-1');
      expect(parsed.status).toBe('OPEN');
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: CLINIC_ID,
          actionType: 'DATA_SUBJECT_REQUEST_CREATED',
        }),
      );
    });

    it('parses the updated request and records who handled it', async () => {
      (prisma.dataSubjectRequest.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'dsr-1',
        status: 'OPEN',
      } as never);
      (prisma.dataSubjectRequest.update as jest.Mock).mockResolvedValueOnce(
        dsrRow({
          status: 'FULFILLED',
          completedAt: NOW,
          handledAt: NOW,
          handledById: 'user-1',
          resolutionNotes: 'Sent by secure email',
        }) as never,
      );

      const updated = await service.updateDataSubjectRequest(
        CLINIC_ID,
        'dsr-1',
        { status: 'FULFILLED', resolutionNotes: 'Sent by secure email' },
        'user-1',
      );

      const parsed = appDataSubjectRequestSchema.parse(overTheWire(updated));
      expect(parsed.status).toBe('FULFILLED');
      expect(parsed.handledById).toBe('user-1');
      expect(parsed.completedAt).toBe(NOW.toISOString());
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DATA_SUBJECT_REQUEST_UPDATED',
          metadata: expect.objectContaining({
            previousStatus: 'OPEN',
            nextStatus: 'FULFILLED',
          }),
        }),
      );
    });
  });

  describe('GET /audit/recent', () => {
    let service: AuditService;
    let prisma: { auditLog: { findMany: jest.Mock } };

    beforeEach(() => {
      prisma = { auditLog: { findMany: jest.fn() } };
      const clock: IClock = { now: () => NOW };
      service = new AuditService(prisma as unknown as PrismaService, clock);
    });

    it('parses the summary rows, with and without an actor', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'log-1',
          action: 'PATIENT_UPDATED',
          createdAt: new Date('2026-07-04T09:00:00.000Z'),
          user: { name: 'Asha Rao' },
        },
        {
          id: 'log-2',
          action: 'PATIENT_VIEWED',
          createdAt: new Date('2026-07-04T08:00:00.000Z'),
          user: null,
        },
      ] as never);

      const raw = await service.getRecentAuditSummary(CLINIC_ID, 5);

      const parsed = z.array(appAuditLogSummarySchema).parse(overTheWire(raw));
      expect(parsed).toEqual([
        {
          id: 'log-1',
          action: 'PATIENT_UPDATED',
          createdAt: '2026-07-04T09:00:00.000Z',
          actor: { name: 'Asha Rao' },
        },
        {
          id: 'log-2',
          action: 'PATIENT_VIEWED',
          createdAt: '2026-07-04T08:00:00.000Z',
        },
      ]);
    });

    it('clamps the requested limit before querying', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );

      await service.getRecentAuditSummary(CLINIC_ID, 5000);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25 }),
      );

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );
      await service.getRecentAuditSummary(CLINIC_ID, 0);
      expect(prisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('refuses a summary row that lost its action', () => {
      expect(
        z.array(appAuditLogSummarySchema).safeParse([
          {
            id: 'log-1',
            createdAt: '2026-07-04T09:00:00.000Z',
          },
        ]).success,
      ).toBe(false);
    });

    it('treats every audit row key as required', () => {
      expectEveryKeyRequired(appAuditLogSummarySchema, {
        id: 'log-1',
        action: 'PATIENT_UPDATED',
        createdAt: '2026-07-04T09:00:00.000Z',
      });
    });
  });
});
