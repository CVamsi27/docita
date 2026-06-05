import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  IClaimValidationRepository,
  InvoiceForClaimValidation,
  AppointmentForClaimValidation,
} from '@/domains/billing/core/repositories/claim-validation.repository';
import { ClaimValidationService } from './claim-validation.service';

describe('ClaimValidationService', () => {
  const findInvoiceMock =
    jest.fn<(_id: string) => Promise<InvoiceForClaimValidation | null>>();

  const findAppointmentMock =
    jest.fn<(_id: string) => Promise<AppointmentForClaimValidation | null>>();

  const mockRepo: IClaimValidationRepository = {
    findInvoiceForClaimReadiness: findInvoiceMock,
    findAppointmentForClaimReadiness: findAppointmentMock,
  };

  let service: ClaimValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClaimValidationService(mockRepo);
  });

  it('returns ready for invoices without appointment linkage', async () => {
    findInvoiceMock.mockResolvedValue({
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
    findInvoiceMock.mockResolvedValue({
      id: 'inv-2',
      appointmentId: 'appt-2',
      patient: { clinicId: 'clinic-1' },
    });
    findAppointmentMock.mockResolvedValue({
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
    findInvoiceMock.mockResolvedValue({
      id: 'inv-3',
      appointmentId: null,
      patient: { clinicId: 'clinic-A' },
    });

    await expect(
      service.evaluateClaimReadiness('inv-3', 'clinic-B'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assertClaimReady throws when coding is incomplete', async () => {
    findInvoiceMock.mockResolvedValue({
      id: 'inv-4',
      appointmentId: 'appt-4',
      patient: { clinicId: 'clinic-1' },
    });
    findAppointmentMock.mockResolvedValue({
      id: 'appt-4',
      diagnoses: [],
      procedures: [],
    });

    await expect(
      service.assertClaimReady('inv-4', 'clinic-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
