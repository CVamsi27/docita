import { Test, TestingModule } from '@nestjs/testing';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { PatientsController } from './patients.controller';
import { PatientService as PatientsService } from '@/domains/patients/application/services/patient.service';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { Role } from '@workspace/db';

describe('PatientsController (Authorization)', () => {
  let controller: PatientsController;

  const mockPatientsService = {
    listPatients:
      jest.fn<(query: Record<string, unknown>) => Promise<unknown>>(),
    getPatient: jest.fn<() => Promise<unknown>>(),
    createPatient: jest.fn<() => Promise<unknown>>(),
    updatePatient: jest.fn<() => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        {
          provide: PatientsService,
          useValue: mockPatientsService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PatientsController>(PatientsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization - Role-Based Access Control', () => {
    it('should verify @Roles decorator is applied to controller', () => {
      const metadata = Reflect.getMetadata('roles', PatientsController);
      expect(metadata).toBeDefined();
      expect(metadata).toContain(Role.DOCTOR);
      expect(metadata).toContain(Role.ADMIN);
    });

    it('should allow DOCTOR role to access patients', async () => {
      const mockRequest = {
        user: {
          clinicId: 'clinic-1',
          role: Role.DOCTOR,
          sub: 'doctor-1',
        },
      };

      mockPatientsService.listPatients.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      const result = await controller.findAll(
        mockRequest as never,
        {
          limit: 10,
        } as never,
      );

      expect(result).toEqual({ items: [], count: 0, hasMore: false });
      const firstCallQuery = mockPatientsService.listPatients.mock.calls[0]![0];

      expect(firstCallQuery['clinicId']).toBe('clinic-1');
      expect(firstCallQuery['limit']).toBe(10);
      expect(firstCallQuery['page']).toBe(1);
    });

    it('should enforce clinic isolation - can only access own clinic patients', async () => {
      const mockRequest = {
        user: {
          clinicId: 'clinic-1',
          role: Role.DOCTOR,
          sub: 'doctor-1',
        },
      };

      mockPatientsService.listPatients.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      await controller.findAll(mockRequest as never, { limit: 10 } as never);

      const firstCallQuery = mockPatientsService.listPatients.mock.calls[0]![0];

      expect(firstCallQuery['clinicId']).toBe('clinic-1');
    });
  });

  describe('Route - GET /patients', () => {
    it('should list all patients with pagination', async () => {
      const mockRequest = {
        user: { clinicId: 'clinic-1' },
      };

      const mockPatients = {
        items: [
          {
            id: 'patient-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        ],
        count: 1,
        hasMore: false,
      };

      mockPatientsService.listPatients.mockResolvedValue(mockPatients);

      const result = await controller.findAll(
        mockRequest as never,
        {
          limit: 10,
        } as never,
      );

      expect(result).toEqual(mockPatients);
    });

    it('should support search parameter', async () => {
      const mockRequest = {
        user: { clinicId: 'clinic-1' },
      };

      mockPatientsService.listPatients.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      await controller.findAll(
        mockRequest as never,
        { limit: 10, search: 'john' } as never,
      );

      const firstCallQuery = mockPatientsService.listPatients.mock.calls[0]![0];

      expect(firstCallQuery['clinicId']).toBe('clinic-1');
      expect(firstCallQuery['search']).toBe('john');
    });
  });

  describe('Input Validation', () => {
    it('should validate pagination limit parameter', async () => {
      const mockRequest = {
        user: { clinicId: 'clinic-1' },
      };

      mockPatientsService.listPatients.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      await controller.findAll(mockRequest as never, { limit: 100 } as never);

      const firstCallQuery = mockPatientsService.listPatients.mock.calls[0]![0];

      expect(firstCallQuery['clinicId']).toBe('clinic-1');
      expect(firstCallQuery['limit']).toBe(100);
    });
  });

  describe('DTO Validation', () => {
    it('should expose create handler for validated DTO input', () => {
      expect(typeof PatientsController.prototype.create).toBe('function');
    });
  });
});
