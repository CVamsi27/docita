import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InvoiceStatus } from '@workspace/db';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  const repository = {
    findAll: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const pdfService = {
    generate: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const eventEmitter = {
    emit: jest.fn<(...args: unknown[]) => unknown>(),
  };

  const usageTracking = {
    trackInvoice: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const storageProvider = {
    supportsSignedUrls: false,
    uploadBuffer: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    generateSignedUrl: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const claimValidationService = {
    assertClaimReady: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    evaluateClaimReadiness: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  let service: InvoicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoicesService(
      repository as never,
      pdfService as never,
      eventEmitter as never,
      usageTracking as never,
      storageProvider as never,
      claimValidationService as never,
    );
  });

  it('validates claim readiness before finalized status transitions', async () => {
    repository.findById.mockResolvedValue({
      id: 'inv-1',
      patientId: 'pat-1',
      total: 100,
      status: InvoiceStatus.PENDING,
      items: [],
      doctorName: null,
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRegistrationNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      patient: { clinic: { id: 'clinic-1' } },
    } as never);
    repository.update.mockResolvedValue({
      id: 'inv-1',
      status: InvoiceStatus.PAID,
    } as never);
    claimValidationService.assertClaimReady.mockResolvedValue(
      undefined as never,
    );

    await service.update('inv-1', { status: InvoiceStatus.PAID }, 'clinic-1');

    expect(claimValidationService.assertClaimReady).toHaveBeenCalledWith(
      'inv-1',
      'clinic-1',
    );
    expect(repository.update).toHaveBeenCalled();
  });

  it('does not validate claim readiness for non-finalized updates', async () => {
    repository.findById.mockResolvedValue({
      id: 'inv-2',
      patientId: 'pat-2',
      total: 100,
      status: InvoiceStatus.PENDING,
      items: [],
      doctorName: null,
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRegistrationNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      patient: { clinic: { id: 'clinic-1' } },
    } as never);
    repository.update.mockResolvedValue({
      id: 'inv-2',
      status: InvoiceStatus.PENDING,
    } as never);

    await service.update('inv-2', { total: 150 }, 'clinic-1');

    expect(claimValidationService.assertClaimReady).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it('submitClaim asserts readiness and returns submission payload', async () => {
    claimValidationService.assertClaimReady.mockResolvedValue(
      undefined as never,
    );
    repository.findById.mockResolvedValue({
      id: 'inv-3',
      patientId: 'pat-3',
      total: 50,
      status: InvoiceStatus.PENDING,
      items: [],
      doctorName: null,
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRegistrationNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      patient: { clinic: { id: 'clinic-1' } },
    } as never);

    const result = await service.submitClaim('inv-3', 'clinic-1');

    expect(claimValidationService.assertClaimReady).toHaveBeenCalledWith(
      'inv-3',
      'clinic-1',
    );
    expect(result.invoiceId).toBe('inv-3');
    expect(result.claimReady).toBe(true);
    expect(result.status).toBe(InvoiceStatus.PENDING);
  });
});
