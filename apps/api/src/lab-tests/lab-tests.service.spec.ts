import { Test, TestingModule } from '@nestjs/testing';
import { LabTestsService } from './lab-tests.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('LabTestsService', () => {
  let service: LabTestsService;
  let prisma: PrismaService;

  const mockLabTest = {
    id: 'test-123',
    name: 'Complete Blood Count',
    code: 'CBC',
    category: 'Hematology',
    price: 500,
    description: 'Full blood work analysis',
    clinicId: 'clinic-123',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLabTestOrder = {
    id: 'order-123',
    clinicId: 'clinic-123',
    patientId: 'patient-123',
    labTestId: 'test-123',
    orderedBy: 'doctor-123',
    status: 'ordered',
    createdAt: new Date(),
    updatedAt: new Date(),
    labTest: mockLabTest,
  };

  const mockPrismaService = {
    labTest: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    labTestOrder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabTestsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LabTestsService>(LabTestsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllTests', () => {
    it('should return all active lab tests for a clinic', async () => {
      mockPrismaService.labTest.findMany.mockResolvedValue([mockLabTest]);

      const result = await service.findAllTests('clinic-123');

      expect(result).toEqual([mockLabTest]);
      expect(mockPrismaService.labTest.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-123', active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array if clinicId is not provided', async () => {
      const result = await service.findAllTests('');
      expect(result).toEqual([]);
    });
  });

  describe('createTest', () => {
    it('should create a new lab test', async () => {
      const createData = {
        name: 'New Test',
        code: 'NT',
        category: 'General',
        price: 300,
      };
      mockPrismaService.labTest.create.mockResolvedValue({
        id: 'new-test-123',
        clinicId: 'clinic-123',
        ...createData,
      });

      const result = await service.createTest('clinic-123', createData);

      expect(result.name).toBe('New Test');
      expect(mockPrismaService.labTest.create).toHaveBeenCalledWith({
        data: { clinicId: 'clinic-123', ...createData },
      });
    });
  });

  describe('findAllOrders', () => {
    it('should return all orders for a clinic', async () => {
      mockPrismaService.labTestOrder.findMany.mockResolvedValue([
        mockLabTestOrder,
      ]);

      const result = await service.findAllOrders('clinic-123');

      expect(result).toEqual([mockLabTestOrder]);
    });

    it('should return empty array if clinicId is not provided', async () => {
      const result = await service.findAllOrders('');
      expect(result).toEqual([]);
    });
  });

  describe('findOrder', () => {
    it('should return a single order', async () => {
      mockPrismaService.labTestOrder.findUnique.mockResolvedValue(
        mockLabTestOrder,
      );

      const result = await service.findOrder('order-123');

      expect(result).toEqual(mockLabTestOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.labTestOrder.findUnique.mockResolvedValue(null);

      await expect(service.findOrder('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createOrder', () => {
    it('should create a lab test order', async () => {
      const orderData = {
        patientId: 'patient-123',
        labTestId: 'test-123',
        notes: 'Fasting required',
      };
      mockPrismaService.labTestOrder.create.mockResolvedValue(mockLabTestOrder);

      const result = await service.createOrder(
        'clinic-123',
        'doctor-123',
        orderData,
      );

      expect(result.patientId).toBe('patient-123');
      expect(mockPrismaService.labTestOrder.create).toHaveBeenCalled();
    });
  });

  describe('updateOrder', () => {
    it('should update order status', async () => {
      const updatedOrder = {
        ...mockLabTestOrder,
        status: 'completed',
        completedAt: expect.any(Date),
      };
      mockPrismaService.labTestOrder.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrder('order-123', {
        status: 'completed',
      });

      expect(result.status).toBe('completed');
    });

    it('should set collectedAt when status is sample_collected', async () => {
      mockPrismaService.labTestOrder.update.mockResolvedValue({
        ...mockLabTestOrder,
        status: 'sample_collected',
      });

      await service.updateOrder('order-123', { status: 'sample_collected' });

      expect(mockPrismaService.labTestOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ collectedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return order statistics', async () => {
      mockPrismaService.labTestOrder.findMany.mockResolvedValue([
        { ...mockLabTestOrder, status: 'ordered', createdAt: new Date() },
        { ...mockLabTestOrder, status: 'completed', createdAt: new Date() },
      ]);

      const result = await service.getStats('clinic-123');

      expect(result.pending).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should return zeros if clinicId is not provided', async () => {
      const result = await service.getStats('');

      expect(result).toEqual({
        pending: 0,
        inProgress: 0,
        completed: 0,
        urgent: 0,
        total: 0,
      });
    });
  });
});
