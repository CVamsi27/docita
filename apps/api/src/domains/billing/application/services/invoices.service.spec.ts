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

  it('includes clinic SLA signature in invoice PDF payload when present', async () => {
    repository.findById.mockResolvedValue({
      id: 'inv-4',
      patientId: 'pat-4',
      total: 100,
      status: InvoiceStatus.PENDING,
      items: [{ description: 'Consultation', quantity: 1, price: 100 }],
      doctorName: 'Dr. Asha',
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRegistrationNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      patient: {
        id: 'pat-4',
        firstName: 'Asha',
        lastName: 'Rao',
        phoneNumber: '9999999999',
        email: null,
        address: null,
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          address: 'Main Road',
          phone: '1234567890',
          email: 'clinic@test.com',
          slaSignatureUrl: 'https://example.com/admin-signature.png',
          settings: null,
        },
      },
      appointment: null,
    } as never);

    pdfService.generate.mockResolvedValue(Buffer.from('pdf') as never);

    await service.generatePDF('inv-4');

    expect(pdfService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedSignatureUrl: 'https://example.com/admin-signature.png',
        authorizedSignatureLabel: 'Authorized Signature',
      }),
    );
  });

  it('keeps invoice PDF generation working when clinic SLA signature is missing', async () => {
    repository.findById.mockResolvedValue({
      id: 'inv-5',
      patientId: 'pat-5',
      total: 100,
      status: InvoiceStatus.PENDING,
      items: [{ description: 'Consultation', quantity: 1, price: 100 }],
      doctorName: 'Dr. Asha',
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRegistrationNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      patient: {
        id: 'pat-5',
        firstName: 'Asha',
        lastName: 'Rao',
        phoneNumber: '9999999999',
        email: null,
        address: null,
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          address: 'Main Road',
          phone: '1234567890',
          email: 'clinic@test.com',
          slaSignatureUrl: null,
          settings: null,
        },
      },
      appointment: null,
    } as never);

    pdfService.generate.mockResolvedValue(Buffer.from('pdf') as never);

    await service.generatePDF('inv-5');

    expect(pdfService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedSignatureUrl: undefined,
      }),
    );
  });
});
