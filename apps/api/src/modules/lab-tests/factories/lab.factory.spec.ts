import { Test, TestingModule } from '@nestjs/testing';
import { LabFactory } from './lab.factory';
import { LabTestOrderStatus } from '@workspace/db';
import { ZodError } from 'zod';

describe('LabFactory', () => {
  let factory: LabFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LabFactory],
    }).compile();

    factory = module.get<LabFactory>(LabFactory);
  });

  describe('createTest', () => {
    it('should create a valid lab test', () => {
      const input = {
        name: 'Blood Count',
        category: 'Hematology',
        code: 'CBC',
        price: 500,
        description: 'Complete blood count',
        clinicId: 'clinic-123',
      };

      const result = factory.createTest(input);
      expect(result).toEqual(input);
      expect(result.name).toBe('Blood Count');
    });

    it('should validate required fields', () => {
      const input = {
        name: 'Blood Count',
        // missing category
        clinicId: 'clinic-123',
      };

      expect(() => factory.createTest(input as any)).toThrow(ZodError);
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
        category: 'Hematology',
        clinicId: 'clinic-123',
      };

      expect(() => factory.createTest(input)).toThrow(ZodError);
    });

    it('should accept optional code and price fields', () => {
      const input = {
        name: 'ECG',
        category: 'Cardiology',
        clinicId: 'clinic-123',
      };

      const result = factory.createTest(input);
      expect(result.name).toBe('ECG');
      expect(result.code).toBeUndefined();
    });
  });

  describe('createOrder', () => {
    it('should create a lab order with ORDERED status', () => {
      const input = {
        patientId: 'patient-123',
        labTestId: 'test-456',
        appointmentId: 'apt-789',
        notes: 'Early morning sample preferred',
      };

      const result = factory.createOrder(input);
      expect(result.status).toBe(LabTestOrderStatus.ORDERED);
      expect(result.patientId).toBe('patient-123');
      expect(result.labTestId).toBe('test-456');
    });

    it('should set status to ORDERED regardless of input', () => {
      const input = {
        patientId: 'patient-123',
        labTestId: 'test-456',
      };

      const result = factory.createOrder(input);
      expect(result.status).toBe(LabTestOrderStatus.ORDERED);
    });

    it('should validate required order fields', () => {
      const input = {
        patientId: 'patient-123',
        // missing labTestId
      };

      expect(() => factory.createOrder(input as any)).toThrow(ZodError);
    });

    it('should preserve all order details', () => {
      const input = {
        patientId: 'patient-123',
        labTestId: 'test-456',
        appointmentId: 'apt-789',
        notes: 'Urgent results needed',
      };

      const result = factory.createOrder(input);
      expect(result.patientId).toBe(input.patientId);
      expect(result.labTestId).toBe(input.labTestId);
      expect(result.appointmentId).toBe(input.appointmentId);
      expect(result.notes).toBe(input.notes);
    });

    it('should handle orders without appointment ID', () => {
      const input = {
        patientId: 'patient-123',
        labTestId: 'test-456',
        notes: 'Standalone test order',
      };

      const result = factory.createOrder(input);
      expect(result.patientId).toBe(input.patientId);
      expect(result.labTestId).toBe(input.labTestId);
    });
  });

  describe('updateOrder', () => {
    it('should update lab order with valid data', () => {
      const input = {
        status: LabTestOrderStatus.PENDING,
        notes: 'Updated notes',
      };

      const result = factory.updateOrder(input);
      expect(result.status).toBe(LabTestOrderStatus.PENDING);
      expect(result.notes).toBe('Updated notes');
    });

    it('should validate status values', () => {
      const validStatuses = [
        LabTestOrderStatus.ORDERED,
        LabTestOrderStatus.PENDING,
        LabTestOrderStatus.COMPLETED,
        LabTestOrderStatus.CANCELLED,
      ];

      validStatuses.forEach((status) => {
        const input = {
          status,
          notes: 'Test',
        };

        const result = factory.updateOrder(input);
        expect(result.status).toBe(status);
      });
    });

    it('should allow partial updates with only status', () => {
      const input = {
        status: LabTestOrderStatus.COMPLETED,
      };

      const result = factory.updateOrder(input);
      expect(result.status).toBe(LabTestOrderStatus.COMPLETED);
    });

    it('should allow updates with only notes', () => {
      const input = {
        notes: 'All tests completed',
      };

      const result = factory.updateOrder(input);
      expect(result.notes).toBe('All tests completed');
    });

    it('should allow result updates', () => {
      const input = {
        status: LabTestOrderStatus.COMPLETED,
        result: { hemoglobin: 14.5, rbc: 5.2 },
      };

      const result = factory.updateOrder(input);
      expect(result.result).toEqual({ hemoglobin: 14.5, rbc: 5.2 });
    });
  });
});
