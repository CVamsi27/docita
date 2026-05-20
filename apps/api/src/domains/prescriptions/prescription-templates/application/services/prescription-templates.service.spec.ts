import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import {
  IPrescriptionTemplatesRepository,
  PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN,
} from '@/domains/prescriptions/prescription-templates/application/ports/prescription-templates.repository.port';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('PrescriptionTemplatesService', () => {
  let service: PrescriptionTemplatesService;
  let repository: IPrescriptionTemplatesRepository;

  const mockRepository: IPrescriptionTemplatesRepository = {
    findAll: jest.fn<IPrescriptionTemplatesRepository['findAll']>(),
    findById: jest.fn<IPrescriptionTemplatesRepository['findById']>(),
    create: jest.fn<IPrescriptionTemplatesRepository['create']>(),
    update: jest.fn<IPrescriptionTemplatesRepository['update']>(),
    delete: jest.fn<IPrescriptionTemplatesRepository['delete']>(),
  };

  const mockTemplate = {
    id: 'template-123',
    name: 'Standard Fever',
    medications: [
      {
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'TID',
        duration: '3 days',
      },
    ],
    instructions: 'Rest and fluids',
    userId: 'user-123',
    clinicId: 'clinic-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionTemplatesService,
        {
          provide: PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PrescriptionTemplatesService>(
      PrescriptionTemplatesService,
    );
    repository = module.get<IPrescriptionTemplatesRepository>(
      PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('findAll', () => {
    it('should return templates for a user', async () => {
      jest.mocked(mockRepository.findAll).mockResolvedValue([mockTemplate]);

      const result = await service.findAll('user-123');
      expect(result).toEqual([mockTemplate]);
      expect(mockRepository.findAll).toHaveBeenCalledWith('user-123');
    });
  });

  describe('create', () => {
    it('should create a template', async () => {
      jest.mocked(mockRepository.create).mockResolvedValue(mockTemplate);

      const createData = {
        name: 'Standard Fever',
        medications: mockTemplate.medications,
        instructions: mockTemplate.instructions,
      };

      const result = await service.create('user-123', createData);
      expect(result).toEqual(mockTemplate);
      expect(mockRepository.create).toHaveBeenCalledWith(
        'user-123',
        createData,
      );
    });
  });
});
