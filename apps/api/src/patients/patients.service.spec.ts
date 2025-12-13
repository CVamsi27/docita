import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PatientsRepository } from '../common/repositories/patients.repository';
import { NotFoundException } from '@nestjs/common';

describe('PatientsService', () => {
  let service: PatientsService;
  let repository: PatientsRepository;

  const mockPatient = {
    id: 'patient-123',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '1234567890',
    email: 'john@example.com',
    gender: 'MALE',
    dateOfBirth: new Date('1990-01-01'),
    clinicId: 'clinic-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    items: [mockPatient],
    hasMore: false,
    nextCursor: undefined,
    count: 1,
  };

  const mockPatientsRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAppointments: jest.fn(),
    getDocuments: jest.fn(),
    getTags: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PatientsRepository,
          useValue: mockPatientsRepository,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    repository = module.get<PatientsRepository>(PatientsRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return patients for a clinic', async () => {
      mockPatientsRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll('clinic-123');

      expect(result).toEqual(mockPaginatedResult);
      expect(mockPatientsRepository.findAll).toHaveBeenCalledWith(
        'clinic-123',
        undefined,
      );
    });

    it('should pass options to repository', async () => {
      mockPatientsRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const options = { search: 'John', limit: 10 };
      await service.findAll('clinic-123', options);

      expect(mockPatientsRepository.findAll).toHaveBeenCalledWith(
        'clinic-123',
        options,
      );
    });
  });

  describe('findOne', () => {
    it('should return a patient', async () => {
      mockPatientsRepository.findOneOrFail.mockResolvedValue(mockPatient);

      const result = await service.findOne('patient-123');

      expect(result).toEqual(mockPatient);
      expect(mockPatientsRepository.findOneOrFail).toHaveBeenCalledWith(
        'patient-123',
      );
    });

    it('should throw NotFoundException if patient not found', async () => {
      mockPatientsRepository.findOneOrFail.mockRejectedValue(
        new NotFoundException('Patient with ID patient-123 not found'),
      );

      await expect(service.findOne('patient-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a patient', async () => {
      const createData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        gender: 'MALE',
        dateOfBirth: '1990-01-01',
        clinicId: 'clinic-123',
      };

      mockPatientsRepository.create.mockResolvedValue(mockPatient);

      const result = await service.create(createData);

      expect(result).toEqual(mockPatient);
      expect(mockPatientsRepository.create).toHaveBeenCalledWith(createData);
    });
  });

  describe('update', () => {
    it('should update a patient', async () => {
      const updateData = { firstName: 'Jane' };
      const updatedPatient = { ...mockPatient, ...updateData };

      mockPatientsRepository.update.mockResolvedValue(updatedPatient);

      const result = await service.update('patient-123', updateData);

      expect(result).toEqual(updatedPatient);
      expect(mockPatientsRepository.update).toHaveBeenCalledWith(
        'patient-123',
        updateData,
      );
    });
  });

  describe('remove', () => {
    it('should delete a patient', async () => {
      mockPatientsRepository.delete.mockResolvedValue(undefined);

      await service.remove('patient-123');

      expect(mockPatientsRepository.delete).toHaveBeenCalledWith('patient-123');
    });
  });

  describe('getAppointments', () => {
    it('should return patient appointments', async () => {
      const appointments = [{ id: 'apt-1' }];
      mockPatientsRepository.getAppointments.mockResolvedValue(appointments);

      const result = await service.getAppointments('patient-123');

      expect(result).toEqual(appointments);
      expect(mockPatientsRepository.getAppointments).toHaveBeenCalledWith(
        'patient-123',
      );
    });
  });

  describe('getDocuments', () => {
    it('should return patient documents', async () => {
      const documents = [{ id: 'doc-1' }];
      mockPatientsRepository.getDocuments.mockResolvedValue(documents);

      const result = await service.getDocuments('patient-123');

      expect(result).toEqual(documents);
      expect(mockPatientsRepository.getDocuments).toHaveBeenCalledWith(
        'patient-123',
      );
    });
  });

  describe('getTags', () => {
    it('should return patient tags', async () => {
      const tags = [{ id: 'tag-1', tag: 'VIP', color: 'blue' }];
      mockPatientsRepository.getTags.mockResolvedValue(tags);

      const result = await service.getTags('patient-123');

      expect(result).toEqual(tags);
      expect(mockPatientsRepository.getTags).toHaveBeenCalledWith(
        'patient-123',
      );
    });
  });
});
