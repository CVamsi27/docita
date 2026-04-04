import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { ClaimValidationService } from './claim-validation.service';

type InvoiceLookup = {
  id: string;
  appointmentId: string | null;
  patient: { clinicId: string };
};

type AppointmentLookup = {
  id: string;
  diagnoses: Array<{ id: string; icdCodeId: string | null }>;
  procedures: Array<{ id: string; cptCodeId: string | null }>;
};

describe('ClaimValidationService', () => {
  const invoiceFindUniqueMock = jest.fn<
    (_args: {
      where: { id: string };
      select: {
        id: true;
        appointmentId: true;
        patient: { select: { clinicId: true } };
      };
    }) => Promise<InvoiceLookup | null>
  >();

  const appointmentFindUniqueMock = jest.fn<
    (_args: {
      where: { id: string };
      select: {
        id: true;
        diagnoses: { select: { id: true; icdCodeId: true } };
        procedures: { select: { id: true; cptCodeId: true } };
      };
    }) => Promise<AppointmentLookup | null>
  >();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    invoice: {
      value: {
        findUnique: invoiceFindUniqueMock,
      },
      writable: true,
    },
    appointment: {
      value: {
        findUnique: appointmentFindUniqueMock,
      },
      writable: true,
    },
  });

  let service: ClaimValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClaimValidationService(prisma);
  });

  it('returns ready for invoices without appointment linkage', async () => {
    invoiceFindUniqueMock.mockResolvedValue({
      id: 'inv-1',
      appointmentId: null,
      patient: { clinicId: 'clinic-1' },
    });

    const result = await service.evaluateClaimReadiness('inv-1', 'clinic-1');

    expect(result.claimReady).toBe(true);
    expect(result.requiresClinicalCoding).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it('returns incomplete result when diagnosis/procedure coding is missing', async () => {
    invoiceFindUniqueMock.mockResolvedValue({
      id: 'inv-2',
      appointmentId: 'appt-2',
      patient: { clinicId: 'clinic-1' },
    });
    appointmentFindUniqueMock.mockResolvedValue({
      id: 'appt-2',
      diagnoses: [{ id: 'd1', icdCodeId: null }],
      procedures: [{ id: 'p1', cptCodeId: null }],
    });

    const result = await service.evaluateClaimReadiness('inv-2', 'clinic-1');

    expect(result.claimReady).toBe(false);
    expect(result.summary.uncodedDiagnoses).toBe(1);
    expect(result.summary.uncodedProcedures).toBe(1);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing ICD'),
        expect.stringContaining('missing CPT/HCPCS'),
      ]),
    );
  });

  it('throws on clinic mismatch', async () => {
    invoiceFindUniqueMock.mockResolvedValue({
      id: 'inv-3',
      appointmentId: null,
      patient: { clinicId: 'clinic-A' },
    });

    await expect(
      service.evaluateClaimReadiness('inv-3', 'clinic-B'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assertClaimReady throws when coding is incomplete', async () => {
    invoiceFindUniqueMock.mockResolvedValue({
      id: 'inv-4',
      appointmentId: 'appt-4',
      patient: { clinicId: 'clinic-1' },
    });
    appointmentFindUniqueMock.mockResolvedValue({
      id: 'appt-4',
      diagnoses: [],
      procedures: [],
    });

    await expect(
      service.assertClaimReady('inv-4', 'clinic-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
