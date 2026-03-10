import { Test, TestingModule } from '@nestjs/testing';
import { CustomFieldsService } from './custom-fields.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException as _NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    customField: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCustomField = {
    id: 'field-1',
    name: 'Insurance Provider',
    fieldType: 'text',
    required: true,
    options: null,
    order: 1,
    clinicId: 'clinic-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
    prismaService = module.get<PrismaService>(PrismaService);

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

  describe('findAll', () => {
    it('should return all custom fields ordered by order', async () => {
      const fields = [mockCustomField];
      mockPrismaService.customField.findMany.mockResolvedValue(fields);

      const result = await service.findAll();

      expect(result).toEqual(fields);
      expect(mockPrismaService.customField.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { order: 'asc' },
      });
    });

    it('should return empty array when no fields exist', async () => {
      mockPrismaService.customField.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should return fields in ascending order', async () => {
      const fields = [
        { ...mockCustomField, id: 'field-1', order: 1 },
        { ...mockCustomField, id: 'field-2', order: 2 },
        { ...mockCustomField, id: 'field-3', order: 3 },
      ];
      mockPrismaService.customField.findMany.mockResolvedValue(fields);

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
      expect(result[2].order).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a custom field by id', async () => {
      mockPrismaService.customField.findUnique.mockResolvedValue(
        mockCustomField,
      );

      const result = await service.findOne('field-1');

      expect(result).toEqual(mockCustomField);
      expect(mockPrismaService.customField.findUnique).toHaveBeenCalledWith({
        where: { id: 'field-1' },
      });
    });

    it('should return null when field not found', async () => {
      mockPrismaService.customField.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new custom field with all properties', async () => {
      const createData = {
        name: 'Insurance Provider',
        fieldType: 'text',
        required: true,
        options: 'Provider A,Provider B,Provider C',
        order: 1,
        clinicId: 'clinic-1',
      };

      mockPrismaService.customField.create.mockResolvedValue(mockCustomField);

      const result = await service.create(createData);

      expect(result).toEqual(mockCustomField);
      expect(mockPrismaService.customField.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should create field with minimal properties', async () => {
      const createData = {
        name: 'Simple Field',
        fieldType: 'text',
      };

      const minimalField = {
        ...mockCustomField,
        name: 'Simple Field',
        required: false,
        options: null,
        order: 0,
        clinicId: null,
      };

      mockPrismaService.customField.create.mockResolvedValue(minimalField);

      const result = await service.create(createData);

      expect(result).toEqual(minimalField);
      expect(mockPrismaService.customField.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should create dropdown field with options', async () => {
      const createData = {
        name: 'Blood Type',
        fieldType: 'dropdown',
        options: 'A+,A-,B+,B-,O+,O-,AB+,AB-',
      };

      mockPrismaService.customField.create.mockResolvedValue({
        ...mockCustomField,
        fieldType: 'dropdown',
        options: 'A+,A-,B+,B-,O+,O-,AB+,AB-',
      });

      const result = await service.create(createData);

      expect(result.fieldType).toBe('dropdown');
      expect(result.options).toBeTruthy();
    });

    it('should create checkbox field', async () => {
      const createData = {
        name: 'Consent Given',
        fieldType: 'checkbox',
      };

      mockPrismaService.customField.create.mockResolvedValue({
        ...mockCustomField,
        fieldType: 'checkbox',
      });

      const result = await service.create(createData);

      expect(result.fieldType).toBe('checkbox');
    });
  });

  describe('update', () => {
    it('should update custom field name', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedField = { ...mockCustomField, name: 'Updated Name' };

      mockPrismaService.customField.findUnique.mockResolvedValue(
        mockCustomField,
      );
      mockPrismaService.customField.update.mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result).toEqual(updatedField);
      expect(mockPrismaService.customField.update).toHaveBeenCalledWith({
        where: { id: 'field-1' },
        data: updateData,
      });
    });

    it('should update required flag', async () => {
      const updateData = { required: false };
      const updatedField = { ...mockCustomField, required: false };

      mockPrismaService.customField.update.mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.required).toBe(false);
    });

    it('should update field type', async () => {
      const updateData = { fieldType: 'dropdown' };
      const updatedField = { ...mockCustomField, fieldType: 'dropdown' };

      mockPrismaService.customField.update.mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.fieldType).toBe('dropdown');
    });

    it('should update display order', async () => {
      const updateData = { order: 5 };
      const updatedField = { ...mockCustomField, order: 5 };

      mockPrismaService.customField.update.mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.order).toBe(5);
    });

    it('should update options for dropdown fields', async () => {
      const updateData = { options: 'Option 1,Option 2,Option 3' };
      const updatedField = {
        ...mockCustomField,
        options: 'Option 1,Option 2,Option 3',
      };

      mockPrismaService.customField.update.mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.options).toBe('Option 1,Option 2,Option 3');
    });

    it('should update multiple properties at once', async () => {
      const updateData = {
        name: 'New Name',
        fieldType: 'textarea',
        required: true,
        order: 10,
      };
      const updatedField = { ...mockCustomField, ...updateData };

      mockPrismaService.customField.update.mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.name).toBe('New Name');
      expect(result.fieldType).toBe('textarea');
      expect(result.required).toBe(true);
      expect(result.order).toBe(10);
    });
  });

  describe('remove', () => {
    it('should delete a custom field', async () => {
      mockPrismaService.customField.delete.mockResolvedValue(mockCustomField);

      const result = await service.remove('field-1');

      expect(result).toEqual(mockCustomField);
      expect(mockPrismaService.customField.delete).toHaveBeenCalledWith({
        where: { id: 'field-1' },
      });
    });

    it('should propagate error when field not found', async () => {
      mockPrismaService.customField.findUnique.mockResolvedValue(null);
      mockPrismaService.customField.delete.mockRejectedValue(
        new Error('Record not found'),
      );

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        'Custom field with ID non-existent-id not found',
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors from findMany', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.customField.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate database errors from create', async () => {
      const error = new Error('Unique constraint violation');
      mockPrismaService.customField.create.mockRejectedValue(error);

      await expect(
        service.create({ name: 'Test', fieldType: 'text' }),
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should propagate database errors from update', async () => {
      mockPrismaService.customField.findUnique.mockResolvedValue(
        mockCustomField,
      );
      const error = new Error('Record not found');
      mockPrismaService.customField.update.mockRejectedValue(error);

      await expect(
        service.update('field-1', { name: 'Updated' }),
      ).rejects.toThrow('Record not found');
    });
  });
});
