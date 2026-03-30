import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MedicalDocumentsService } from './medical-documents.service';
import { MEDICAL_DOCUMENTS_REPOSITORY_TOKEN } from './core/repositories/medical-documents.repository.interface';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('MedicalDocumentsService', () => {
  let service: MedicalDocumentsService;
  let repo: Record<string, jest.Mock<(...args: unknown[]) => Promise<unknown>>>;

  const mockDoc = {
    id: 'doc-1',
    type: 'FIT_TO_WORK',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    clinicId: 'clinic-1',
    appointmentId: null,
    title: 'Fitness Certificate',
    content: { remarks: 'Fit' },
    validFrom: null,
    validUntil: null,
    status: 'DRAFT',
    signedAt: null,
    signatureUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findAllForPatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalDocumentsService,
        { provide: MEDICAL_DOCUMENTS_REPOSITORY_TOKEN, useValue: repo },
      ],
    }).compile();

    service = module.get<MedicalDocumentsService>(MedicalDocumentsService);
  });

  describe('create', () => {
    it('creates a medical document', async () => {
      repo.create.mockResolvedValue(mockDoc);

      const result = await service.create({
        type: 'FIT_TO_WORK',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        title: 'Fitness Certificate',
        content: { remarks: 'Fit' },
      });

      expect(repo.create).toHaveBeenCalled();
      expect(result.id).toBe('doc-1');
    });
  });

  describe('findAllForPatient', () => {
    it('returns all documents for a patient in a clinic', async () => {
      repo.findAllForPatient.mockResolvedValue([mockDoc]);

      const result = await service.findAllForPatient('clinic-1', 'patient-1');

      expect(repo.findAllForPatient).toHaveBeenCalledWith(
        'clinic-1',
        'patient-1',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a document by id', async () => {
      repo.findOne.mockResolvedValue(mockDoc);

      const result = await service.findOne('doc-1', 'clinic-1');
      expect(result.id).toBe('doc-1');
    });

    it('throws NotFoundException when document not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'clinic-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when document not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'clinic-1', { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates a document', async () => {
      repo.findOne.mockResolvedValue(mockDoc);
      repo.update.mockResolvedValue({
        ...mockDoc,
        title: 'Updated Certificate',
      });

      const result = await service.update('doc-1', 'clinic-1', {
        title: 'Updated Certificate',
      });
      expect(result.title).toBe('Updated Certificate');
    });
  });

  describe('sign', () => {
    it('signs a draft document', async () => {
      repo.findOne.mockResolvedValue(mockDoc);
      repo.update.mockResolvedValue({ ...mockDoc, status: 'SIGNED' });

      const result = await service.sign('doc-1', 'clinic-1');
      expect(result.status).toBe('SIGNED');
    });

    it('throws ForbiddenException when signing a revoked document', async () => {
      repo.findOne.mockResolvedValue({ ...mockDoc, status: 'REVOKED' });

      await expect(service.sign('doc-1', 'clinic-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('revoke', () => {
    it('revokes a document', async () => {
      repo.findOne.mockResolvedValue(mockDoc);
      repo.update.mockResolvedValue({ ...mockDoc, status: 'REVOKED' });

      const result = await service.revoke('doc-1', 'clinic-1');
      expect(result.status).toBe('REVOKED');
    });
  });

  describe('delete', () => {
    it('deletes a document', async () => {
      repo.findOne.mockResolvedValue(mockDoc);
      repo.delete.mockResolvedValue(mockDoc);

      const result = await service.delete('doc-1', 'clinic-1');
      expect(result.id).toBe('doc-1');
    });
  });
});
