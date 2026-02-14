import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    clinicalTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockTemplate = {
    id: 'template-1',
    name: 'Cardiology Consultation',
    speciality: 'cardiology',
    fields: [
      {
        id: 'field-1',
        label: 'Blood Pressure',
        type: 'text',
      },
      {
        id: 'field-2',
        label: 'Heart Rate',
        type: 'number',
      },
    ],
    defaultObservations: 'Patient appears stable',
    clinicId: 'clinic-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject PrismaService', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new template successfully', async () => {
      const createData = {
        name: 'Cardiology Consultation',
        speciality: 'cardiology',
        fields: [
          {
            id: 'field-1',
            label: 'Blood Pressure',
            type: 'text',
          },
        ],
        defaultObservations: 'Patient appears stable',
        clinicId: 'clinic-1',
      };

      mockPrismaService.clinicalTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.create(createData);

      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.clinicalTemplate.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          speciality: createData.speciality,
          fields: createData.fields,
          defaultObservations: createData.defaultObservations,
          clinicId: createData.clinicId,
        },
      });
    });

    it('should create template without optional fields', async () => {
      const createData = {
        name: 'Basic Template',
        speciality: 'general',
        fields: [],
      };

      const expectedTemplate = {
        ...mockTemplate,
        name: 'Basic Template',
        speciality: 'general',
        fields: [],
        defaultObservations: null,
        clinicId: null,
      };

      mockPrismaService.clinicalTemplate.create.mockResolvedValue(
        expectedTemplate,
      );

      const result = await service.create(createData);

      expect(result).toEqual(expectedTemplate);
      expect(mockPrismaService.clinicalTemplate.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          speciality: createData.speciality,
          fields: createData.fields,
          defaultObservations: undefined,
          clinicId: undefined,
        },
      });
    });

    it('should handle fields with options', async () => {
      const createData = {
        name: 'Template with Options',
        speciality: 'general',
        fields: [
          {
            id: 'field-1',
            label: 'Pain Level',
            type: 'select',
            options: ['Mild', 'Moderate', 'Severe'],
          },
        ],
      };

      mockPrismaService.clinicalTemplate.create.mockResolvedValue({
        ...mockTemplate,
        fields: createData.fields,
      });

      const result = await service.create(createData);

      expect(result.fields).toEqual(createData.fields);
    });
  });

  describe('findAll', () => {
    it('should return all templates without filters', async () => {
      const templates = [mockTemplate];
      mockPrismaService.clinicalTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll();

      expect(result).toEqual(templates);
      expect(mockPrismaService.clinicalTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should filter by clinicId', async () => {
      const templates = [mockTemplate];
      mockPrismaService.clinicalTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll({ clinicId: 'clinic-1' });

      expect(result).toEqual(templates);
      expect(mockPrismaService.clinicalTemplate.findMany).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-1',
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should filter by speciality', async () => {
      const templates = [mockTemplate];
      mockPrismaService.clinicalTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll({ speciality: 'cardiology' });

      expect(result).toEqual(templates);
      expect(mockPrismaService.clinicalTemplate.findMany).toHaveBeenCalledWith({
        where: {
          speciality: 'cardiology',
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should not filter when speciality is "all"', async () => {
      const templates = [mockTemplate];
      mockPrismaService.clinicalTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll({ speciality: 'all' });

      expect(result).toEqual(templates);
      expect(mockPrismaService.clinicalTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should filter by search term', async () => {
      const templates = [mockTemplate];
      mockPrismaService.clinicalTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll({ search: 'Cardiology' });

      expect(result).toEqual(templates);
      expect(mockPrismaService.clinicalTemplate.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'Cardiology', mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should combine multiple filters', async () => {
      const templates = [mockTemplate];
      mockPrismaService.clinicalTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll({
        clinicId: 'clinic-1',
        speciality: 'cardiology',
        search: 'Consultation',
      });

      expect(result).toEqual(templates);
      expect(mockPrismaService.clinicalTemplate.findMany).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-1',
          speciality: 'cardiology',
          name: { contains: 'Consultation', mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should return empty array when no templates match', async () => {
      mockPrismaService.clinicalTemplate.findMany.mockResolvedValue([]);

      const result = await service.findAll({ search: 'NonExistent' });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      mockPrismaService.clinicalTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.findOne('template-1');

      expect(result).toEqual(mockTemplate);
      expect(
        mockPrismaService.clinicalTemplate.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should return null when template not found', async () => {
      mockPrismaService.clinicalTemplate.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update template name successfully', async () => {
      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Cardiology Template',
      };

      mockPrismaService.clinicalTemplate.update.mockResolvedValue(
        updatedTemplate,
      );

      const result = await service.update('template-1', {
        name: 'Updated Cardiology Template',
      });

      expect(result).toEqual(updatedTemplate);
      expect(mockPrismaService.clinicalTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          name: 'Updated Cardiology Template',
          speciality: undefined,
          fields: undefined,
          defaultObservations: undefined,
        },
      });
    });

    it('should update template fields successfully', async () => {
      const newFields = [
        {
          id: 'field-3',
          label: 'Temperature',
          type: 'number',
        },
      ];

      const updatedTemplate = {
        ...mockTemplate,
        fields: newFields,
      };

      mockPrismaService.clinicalTemplate.update.mockResolvedValue(
        updatedTemplate,
      );

      const result = await service.update('template-1', { fields: newFields });

      expect(result).toEqual(updatedTemplate);
      expect(mockPrismaService.clinicalTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          name: undefined,
          speciality: undefined,
          fields: newFields,
          defaultObservations: undefined,
        },
      });
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        name: 'Updated Template',
        speciality: 'neurology',
        defaultObservations: 'New observations',
      };

      const updatedTemplate = {
        ...mockTemplate,
        ...updateData,
      };

      mockPrismaService.clinicalTemplate.update.mockResolvedValue(
        updatedTemplate,
      );

      const result = await service.update('template-1', updateData);

      expect(result).toEqual(updatedTemplate);
      expect(mockPrismaService.clinicalTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          name: updateData.name,
          speciality: updateData.speciality,
          fields: undefined,
          defaultObservations: updateData.defaultObservations,
        },
      });
    });

    it('should handle empty update data', async () => {
      mockPrismaService.clinicalTemplate.update.mockResolvedValue(mockTemplate);

      const result = await service.update('template-1', {});

      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.clinicalTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          name: undefined,
          speciality: undefined,
          fields: undefined,
          defaultObservations: undefined,
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete a template successfully', async () => {
      mockPrismaService.clinicalTemplate.delete.mockResolvedValue(mockTemplate);

      const result = await service.remove('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.clinicalTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should propagate errors when template not found', async () => {
      const error = new Error('Template not found');
      mockPrismaService.clinicalTemplate.delete.mockRejectedValue(error);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        'Template not found',
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors from create', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.clinicalTemplate.create.mockRejectedValue(error);

      await expect(
        service.create({
          name: 'Test',
          speciality: 'general',
          fields: [],
        }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors from findMany', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.clinicalTemplate.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate database errors from update', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.clinicalTemplate.update.mockRejectedValue(error);

      await expect(
        service.update('template-1', { name: 'Updated' }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
