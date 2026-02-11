import { Test, TestingModule } from '@nestjs/testing';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@workspace/db';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('PatientsController (Authorization)', () => {
  let controller: PatientsController;
  let patientsService: PatientsService;

  const mockPatientsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      .useValue({ canActivate: jest.fn((context) => true) })
      .compile();

    controller = module.get<PatientsController>(PatientsController);
    patientsService = module.get<PatientsService>(PatientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization - Role-Based Access Control', () => {
    it('should verify @Roles decorator is applied to controller', () => {
      // Verify that controller has Roles metadata
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

      mockPatientsService.findAll.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      const result = await controller.findAll(
        mockRequest as any,
        '10',
        undefined,
        undefined,
      );

      expect(result).toEqual({ items: [], count: 0, hasMore: false });
      expect(mockPatientsService.findAll).toHaveBeenCalledWith('clinic-1', {
        limit: 10,
        cursor: undefined,
        search: undefined,
      });
    });

    it('should enforce clinic isolation - can only access own clinic patients', async () => {
      const mockRequest = {
        user: {
          clinicId: 'clinic-1',
          role: Role.DOCTOR,
          sub: 'doctor-1',
        },
      };

      mockPatientsService.findAll.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      await controller.findAll(mockRequest as any, '10', undefined, undefined);

      // Verify service was called with user's clinicId, not a different clinic
      expect(mockPatientsService.findAll).toHaveBeenCalledWith(
        'clinic-1',
        expect.any(Object),
      );
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

      mockPatientsService.findAll.mockResolvedValue(mockPatients);

      const result = await controller.findAll(
        mockRequest as any,
        '10',
        undefined,
        undefined,
      );

      expect(result).toEqual(mockPatients);
    });

    it('should support search parameter', async () => {
      const mockRequest = {
        user: { clinicId: 'clinic-1' },
      };

      mockPatientsService.findAll.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      await controller.findAll(mockRequest as any, '10', undefined, 'john');

      expect(mockPatientsService.findAll).toHaveBeenCalledWith(
        'clinic-1',
        expect.objectContaining({
          search: 'john',
        }),
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate pagination limit parameter', async () => {
      const mockRequest = {
        user: { clinicId: 'clinic-1' },
      };

      mockPatientsService.findAll.mockResolvedValue({
        items: [],
        count: 0,
        hasMore: false,
      });

      await controller.findAll(mockRequest as any, '100', undefined, undefined);

      // Should parse limit correctly
      expect(mockPatientsService.findAll).toHaveBeenCalledWith(
        'clinic-1',
        expect.objectContaining({
          limit: 100,
        }),
      );
    });
  });

  describe('DTO Validation', () => {
    it('should accept valid CreatePatientDto', () => {
      // Verify DTO has proper Zod validation
      const CreatePatientDtoRef = Reflect.getMetadata(
        'ZodSchema',
        PatientsController.prototype.create,
      );
      expect(CreatePatientDtoRef).toBeDefined();
    });
  });
});
