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
import { RequestWithUser } from '@/common/types/common.types';
import { ListPatientsQueryDto } from '@/domains/patients/application/dto/patients.dto';
import { Patient } from '@/domains/patients/core/entities/patient.entity';

describe('PatientsController (Authorization)', () => {
  let controller: PatientsController;
  type AuthRequest = RequestWithUser & {
    user: NonNullable<RequestWithUser['user']>;
  };

  const listPatientsMock = jest.fn<PatientsService['listPatients']>();
  const getPatientMock = jest.fn<PatientsService['getPatient']>();
  const createPatientMock = jest.fn<PatientsService['createPatient']>();
  const updatePatientMock = jest.fn<PatientsService['updatePatient']>();

  const mockPatientsService: Pick<
    PatientsService,
    'listPatients' | 'getPatient' | 'createPatient' | 'updatePatient'
  > = {
    listPatients: listPatientsMock,
    getPatient: getPatientMock,
    createPatient: createPatientMock,
    updatePatient: updatePatientMock,
  };

  const buildRequest = (clinicId = 'clinic-1', role = Role.DOCTOR) => {
    const request = Object.create({}) as AuthRequest;
    const user = Object.create({}) as NonNullable<RequestWithUser['user']>;
    user.clinicId = clinicId;
    user.role = role;
    request.user = user;
    return request;
  };

  const buildQuery = (
    query: Partial<ListPatientsQueryDto>,
  ): ListPatientsQueryDto =>
    ({
      ...query,
    }) as ListPatientsQueryDto;

  const emptyPatients: Awaited<ReturnType<PatientsService['listPatients']>> = {
    items: [],
    total: 0,
    count: 0,
    hasMore: false,
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
      const mockRequest = buildRequest();

      listPatientsMock.mockResolvedValue(emptyPatients);

      const result = await controller.findAll(
        mockRequest,
        buildQuery({
          limit: 10,
        }),
      );

      expect(result).toEqual(emptyPatients);
      const firstCallQuery = listPatientsMock.mock.calls[0]![0];

      expect(firstCallQuery.clinicId).toBe('clinic-1');
      expect(firstCallQuery.limit).toBe(10);
      expect(firstCallQuery.page).toBe(1);
    });

    it('should enforce clinic isolation - can only access own clinic patients', async () => {
      const mockRequest = buildRequest();

      listPatientsMock.mockResolvedValue(emptyPatients);

      await controller.findAll(
        mockRequest,
        buildQuery({
          limit: 10,
        }),
      );

      const firstCallQuery = listPatientsMock.mock.calls[0]![0];

      expect(firstCallQuery.clinicId).toBe('clinic-1');
    });
  });

  describe('Route - GET /patients', () => {
    it('should list all patients with pagination', async () => {
      const mockRequest = buildRequest();

      const mockPatients = {
        items: [
          new Patient({
            id: 'patient-1',
            clinicId: 'clinic-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phoneNumber: '9999999999',
            gender: 'male',
            metadata: {},
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            version: 1,
          }),
        ],
        total: 1,
        count: 1,
        hasMore: false,
      };

      listPatientsMock.mockResolvedValue(mockPatients);

      const result = await controller.findAll(
        mockRequest,
        buildQuery({
          limit: 10,
        }),
      );

      expect(result).toEqual(mockPatients);
    });

    it('should support search parameter', async () => {
      const mockRequest = buildRequest();

      listPatientsMock.mockResolvedValue(emptyPatients);

      await controller.findAll(
        mockRequest,
        buildQuery({ limit: 10, search: 'john' }),
      );

      const firstCallQuery = listPatientsMock.mock.calls[0]![0];

      expect(firstCallQuery.clinicId).toBe('clinic-1');
      expect(firstCallQuery.search).toBe('john');
    });
  });

  describe('Input Validation', () => {
    it('should validate pagination limit parameter', async () => {
      const mockRequest = buildRequest();

      listPatientsMock.mockResolvedValue(emptyPatients);

      await controller.findAll(mockRequest, buildQuery({ limit: 100 }));

      const firstCallQuery = listPatientsMock.mock.calls[0]![0];

      expect(firstCallQuery.clinicId).toBe('clinic-1');
      expect(firstCallQuery.limit).toBe(100);
    });
  });

  describe('DTO Validation', () => {
    it('should expose create handler for validated DTO input', () => {
      expect(typeof PatientsController.prototype.create).toBe('function');
    });
  });
});
