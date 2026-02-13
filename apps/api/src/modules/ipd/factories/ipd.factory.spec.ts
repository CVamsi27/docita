import { Test, TestingModule } from '@nestjs/testing';
import { IpdFactory } from './ipd.factory';
import { AdmissionStatus } from '@workspace/db';
import { ZodError } from 'zod';

describe('IpdFactory', () => {
  let factory: IpdFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpdFactory],
    }).compile();

    factory = module.get<IpdFactory>(IpdFactory);
  });

  describe('createAdmission', () => {
    it('should create an admission with ADMITTED status', () => {
      const input = {
        patientId: 'patient-123',
        bedId: 'bed-456',
        reason: 'Cardiac observation',
        admittingDoctorId: 'doctor-101',
      };

      const result = factory.createAdmission(input);

      expect(result.status).toBe(AdmissionStatus.ADMITTED);
      expect(result.patientId).toBe('patient-123');
      expect(result.bedId).toBe('bed-456');
      expect(result.reason).toBe('Cardiac observation');
    });

    it('should set admittedAt to current date if not provided', () => {
      const beforeCreate = new Date();

      const input = {
        patientId: 'patient-123',
        bedId: 'bed-456',
      };

      const result = factory.createAdmission(input);
      const afterCreate = new Date();

      expect(result.admittedAt).toBeDefined();
      expect(result.admittedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(result.admittedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should use provided admittedAt date', () => {
      const admitDate = new Date('2026-02-01T10:00:00Z');

      const input = {
        patientId: 'patient-123',
        bedId: 'bed-456',
        admittedAt: admitDate,
      };

      const result = factory.createAdmission(input);

      expect(result.admittedAt).toEqual(admitDate);
    });

    it('should validate required fields', () => {
      const input = {
        patientId: 'patient-123',
        // missing bedId
      };

      expect(() => factory.createAdmission(input as any)).toThrow(ZodError);
    });

    it('should validate patientId is not empty', () => {
      const input = {
        patientId: '',
        bedId: 'bed-456',
      };

      expect(() => factory.createAdmission(input as any)).toThrow(ZodError);
    });

    it('should preserve all admission details', () => {
      const admitDate = new Date('2026-02-01T14:30:00Z');

      const input = {
        patientId: 'patient-456',
        bedId: 'bed-789',
        reason: 'Post-surgical care',
        diagnosis: 'Appendicitis post-op',
        admittingDoctorId: 'doctor-202',
        admittedAt: admitDate,
        notes: 'Post-operative monitoring required',
      };

      const result = factory.createAdmission(input);

      expect(result.patientId).toBe(input.patientId);
      expect(result.bedId).toBe(input.bedId);
      expect(result.reason).toBe(input.reason);
      expect(result.diagnosis).toBe(input.diagnosis);
      expect(result.admittingDoctorId).toBe(input.admittingDoctorId);
      expect(result.admittedAt).toEqual(admitDate);
      expect(result.status).toBe(AdmissionStatus.ADMITTED);
    });

    it('should handle admission with optional fields', () => {
      const input = {
        patientId: 'patient-789',
        bedId: 'bed-101',
        reason: 'Emergency admission',
        notes: 'Critical condition',
      };

      const result = factory.createAdmission(input);

      expect(result.patientId).toBe(input.patientId);
      expect(result.bedId).toBe(input.bedId);
      expect(result.status).toBe(AdmissionStatus.ADMITTED);
    });

    it('should always set status to ADMITTED', () => {
      const inputs = [
        { patientId: 'p1', bedId: 'b1' },
        { patientId: 'p2', bedId: 'b2', reason: 'reason2' },
        { patientId: 'p3', bedId: 'b3', diagnosis: 'condition' },
      ];

      inputs.forEach((input) => {
        const result = factory.createAdmission(input);
        expect(result.status).toBe(AdmissionStatus.ADMITTED);
      });
    });

    it('should validate bed ID is not empty', () => {
      const input = {
        patientId: 'patient-123',
        bedId: '',
      };

      expect(() => factory.createAdmission(input as any)).toThrow(ZodError);
    });
  });
});
