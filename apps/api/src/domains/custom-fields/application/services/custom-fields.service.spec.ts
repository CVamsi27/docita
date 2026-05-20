import { Test, TestingModule } from '@nestjs/testing';
import { CustomFieldsService } from './custom-fields.service';
import {
  CUSTOM_FIELDS_REPOSITORY_TOKEN,
  ICustomFieldsRepository,
} from '@/domains/custom-fields/application/ports/custom-fields.repository.port';
import { NotFoundException as _NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let customFieldsRepository: ICustomFieldsRepository;

  const mockCustomFieldsRepository: ICustomFieldsRepository = {
    findAll: jest.fn<ICustomFieldsRepository['findAll']>(),
    findById: jest.fn<ICustomFieldsRepository['findById']>(),
    create: jest.fn<ICustomFieldsRepository['create']>(),
    update: jest.fn<ICustomFieldsRepository['update']>(),
    delete: jest.fn<ICustomFieldsRepository['delete']>(),
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
          provide: CUSTOM_FIELDS_REPOSITORY_TOKEN,
          useValue: mockCustomFieldsRepository,
        },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
    customFieldsRepository = module.get<ICustomFieldsRepository>(
      CUSTOM_FIELDS_REPOSITORY_TOKEN,
    );

    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject custom fields repository', () => {
      expect(customFieldsRepository).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all custom fields ordered by order', async () => {
      const fields = [mockCustomField];
      jest.mocked(mockCustomFieldsRepository.findAll).mockResolvedValue(fields);

      const result = await service.findAll();

      expect(result).toEqual(fields);
      expect(mockCustomFieldsRepository.findAll).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should return empty array when no fields exist', async () => {
      jest.mocked(mockCustomFieldsRepository.findAll).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should return fields in ascending order', async () => {
      const fields = [
        { ...mockCustomField, id: 'field-1', order: 1 },
        { ...mockCustomField, id: 'field-2', order: 2 },
        { ...mockCustomField, id: 'field-3', order: 3 },
      ];
      jest.mocked(mockCustomFieldsRepository.findAll).mockResolvedValue(fields);

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
      expect(result[2].order).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a custom field by id', async () => {
      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);

      const result = await service.findOne('field-1');

      expect(result).toEqual(mockCustomField);
      expect(mockCustomFieldsRepository.findById).toHaveBeenCalledWith(
        'field-1',
      );
    });

    it('should return null when field not found', async () => {
      jest.mocked(mockCustomFieldsRepository.findById).mockResolvedValue(null);

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

      jest
        .mocked(mockCustomFieldsRepository.create)
        .mockResolvedValue(mockCustomField);

      const result = await service.create(createData);

      expect(result).toEqual(mockCustomField);
      expect(mockCustomFieldsRepository.create).toHaveBeenCalledWith(
        createData,
      );
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

      jest
        .mocked(mockCustomFieldsRepository.create)
        .mockResolvedValue(minimalField);

      const result = await service.create(createData);

      expect(result).toEqual(minimalField);
      expect(mockCustomFieldsRepository.create).toHaveBeenCalledWith(
        createData,
      );
    });

    it('should create dropdown field with options', async () => {
      const createData = {
        name: 'Blood Type',
        fieldType: 'dropdown',
        options: 'A+,A-,B+,B-,O+,O-,AB+,AB-',
      };

      jest.mocked(mockCustomFieldsRepository.create).mockResolvedValue({
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

      jest.mocked(mockCustomFieldsRepository.create).mockResolvedValue({
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

      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      jest
        .mocked(mockCustomFieldsRepository.update)
        .mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result).toEqual(updatedField);
      expect(mockCustomFieldsRepository.update).toHaveBeenCalledWith(
        'field-1',
        updateData,
      );
    });

    it('should update required flag', async () => {
      const updateData = { required: false };
      const updatedField = { ...mockCustomField, required: false };

      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      jest
        .mocked(mockCustomFieldsRepository.update)
        .mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.required).toBe(false);
    });

    it('should update field type', async () => {
      const updateData = { fieldType: 'dropdown' };
      const updatedField = { ...mockCustomField, fieldType: 'dropdown' };

      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      jest
        .mocked(mockCustomFieldsRepository.update)
        .mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.fieldType).toBe('dropdown');
    });

    it('should update display order', async () => {
      const updateData = { order: 5 };
      const updatedField = { ...mockCustomField, order: 5 };

      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      jest
        .mocked(mockCustomFieldsRepository.update)
        .mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.order).toBe(5);
    });

    it('should update options for dropdown fields', async () => {
      const updateData = { options: 'Option 1,Option 2,Option 3' };
      const updatedField = {
        ...mockCustomField,
        options: 'Option 1,Option 2,Option 3',
      };

      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      jest
        .mocked(mockCustomFieldsRepository.update)
        .mockResolvedValue(updatedField);

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

      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      jest
        .mocked(mockCustomFieldsRepository.update)
        .mockResolvedValue(updatedField);

      const result = await service.update('field-1', updateData);

      expect(result.name).toBe('New Name');
      expect(result.fieldType).toBe('textarea');
      expect(result.required).toBe(true);
      expect(result.order).toBe(10);
    });
  });

  describe('remove', () => {
    it('should delete a custom field', async () => {
      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      jest
        .mocked(mockCustomFieldsRepository.delete)
        .mockResolvedValue(mockCustomField);

      const result = await service.remove('field-1');

      expect(result).toEqual(mockCustomField);
      expect(mockCustomFieldsRepository.delete).toHaveBeenCalledWith('field-1');
    });

    it('should propagate error when field not found', async () => {
      jest.mocked(mockCustomFieldsRepository.findById).mockResolvedValue(null);
      jest
        .mocked(mockCustomFieldsRepository.delete)
        .mockRejectedValue(new Error('Record not found'));

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        'Custom field with ID non-existent-id not found',
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors from findMany', async () => {
      const error = new Error('Database connection failed');
      jest.mocked(mockCustomFieldsRepository.findAll).mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate database errors from create', async () => {
      const error = new Error('Unique constraint violation');
      jest.mocked(mockCustomFieldsRepository.create).mockRejectedValue(error);

      await expect(
        service.create({ name: 'Test', fieldType: 'text' }),
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should propagate database errors from update', async () => {
      jest
        .mocked(mockCustomFieldsRepository.findById)
        .mockResolvedValue(mockCustomField);
      const error = new Error('Record not found');
      jest.mocked(mockCustomFieldsRepository.update).mockRejectedValue(error);

      await expect(
        service.update('field-1', { name: 'Updated' }),
      ).rejects.toThrow('Record not found');
    });
  });
});
