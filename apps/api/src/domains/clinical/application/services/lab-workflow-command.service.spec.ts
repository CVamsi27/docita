import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { LabWorkflowCommandService } from './lab-workflow-command.service';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { LabTestOrderStatus } from '@workspace/db';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';

describe('LabWorkflowCommandService', () => {
  let service: LabWorkflowCommandService;

  const buildOrder = (overrides: { resultUrl?: string; paidAt?: Date }) =>
    new LabOrder(
      'order-1',
      'patient-1',
      'test-1',
      LabTestOrderStatus.RESULT_READY,
      'clinic-1',
      undefined,
      undefined,
      overrides.resultUrl,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      overrides.paidAt,
    );

  const workflowRepository = {
    verifyPayment: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findReleaseContext: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    markReleased: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    attachResult: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const orderRepository = {
    findOrderById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabWorkflowCommandService,
        { provide: 'LabWorkflowRepository', useValue: workflowRepository },
        { provide: 'LabDirectoryRepository', useValue: {} },
        { provide: 'LabOrderRepository', useValue: orderRepository },
        {
          provide: StorageProvider,
          useValue: { upload: jest.fn(), supportsSignedUrls: false },
        },
        {
          provide: SendMessageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-07-01T10:00:00.000Z') },
        },
      ],
    }).compile();

    service = module.get(LabWorkflowCommandService);
  });

  it('releases results after payment when result was uploaded earlier', async () => {
    const pendingOrder = buildOrder({
      resultUrl: 'lab-results/order-1.pdf',
    });
    const paidOrder = buildOrder({
      resultUrl: 'lab-results/order-1.pdf',
      paidAt: new Date('2026-07-01T09:00:00.000Z'),
    });

    expect(paidOrder.canRelease()).toBe(true);

    orderRepository.findOrderById
      .mockImplementationOnce(async () => pendingOrder)
      .mockImplementationOnce(async () => paidOrder);
    workflowRepository.findReleaseContext.mockResolvedValue({
      id: 'order-1',
      clinicId: 'clinic-1',
      status: LabTestOrderStatus.RESULT_READY,
      resultUrl: 'lab-results/order-1.pdf',
      paidAt: new Date('2026-07-01T09:00:00.000Z'),
      testName: 'CBC',
      clinicName: 'Docita Clinic',
      patient: {
        id: 'patient-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: null,
      },
    });

    await service.verifyPayment('order-1', 'clinic-1', {
      method: 'CASH',
      verifiedBy: 'staff-1',
    });

    expect(workflowRepository.verifyPayment).toHaveBeenCalled();
    expect(orderRepository.findOrderById).toHaveBeenCalledTimes(2);
    expect(workflowRepository.markReleased).toHaveBeenCalledWith(
      'order-1',
      'clinic-1',
      expect.any(Date),
    );
  });

  it('rejects payment verification on a terminal (completed/cancelled) order', async () => {
    const completedOrder = new LabOrder(
      'order-1',
      'patient-1',
      'test-1',
      LabTestOrderStatus.COMPLETED,
      'clinic-1',
      undefined,
      undefined,
      'lab-results/order-1.pdf',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Date('2026-07-01T09:00:00.000Z'),
    );
    orderRepository.findOrderById.mockResolvedValue(completedOrder);

    await expect(
      service.verifyPayment('order-1', 'clinic-1', {
        method: 'CASH',
        verifiedBy: 'staff-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowRepository.verifyPayment).not.toHaveBeenCalled();
  });

  it('throws 404 when the order belongs to another clinic (tenant guard)', async () => {
    const otherClinicOrder = new LabOrder(
      'order-1',
      'patient-1',
      'test-1',
      LabTestOrderStatus.ORDERED,
      'clinic-2',
    );
    orderRepository.findOrderById.mockResolvedValue(otherClinicOrder);

    await expect(
      service.verifyPayment('order-1', 'clinic-1', {
        method: 'CASH',
        verifiedBy: 'staff-1',
      }),
    ).rejects.toThrow('Lab order not found');
    expect(workflowRepository.verifyPayment).not.toHaveBeenCalled();
  });

  it('throws 404 when the order does not exist', async () => {
    orderRepository.findOrderById.mockResolvedValue(null);

    await expect(
      service.verifyPayment('order-missing', 'clinic-1', {
        method: 'CASH',
        verifiedBy: 'staff-1',
      }),
    ).rejects.toThrow('Lab order not found');
  });

  it('throws 400 when releasing a result with no uploaded file', async () => {
    workflowRepository.findReleaseContext.mockResolvedValue({
      id: 'order-1',
      clinicId: 'clinic-1',
      status: LabTestOrderStatus.RESULT_READY,
      resultUrl: null,
      paidAt: new Date('2026-07-01T09:00:00.000Z'),
      testName: 'CBC',
      clinicName: 'Docita Clinic',
      patient: {
        id: 'patient-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: null,
      },
    });

    await expect(service.releaseResult('order-1', 'clinic-1')).rejects.toThrow(
      'Upload a result before releasing it to the patient',
    );
    expect(workflowRepository.markReleased).not.toHaveBeenCalled();
  });

  it('throws 400 when releasing a result before payment is verified', async () => {
    workflowRepository.findReleaseContext.mockResolvedValue({
      id: 'order-1',
      clinicId: 'clinic-1',
      status: LabTestOrderStatus.RESULT_READY,
      resultUrl: 'lab-results/order-1.pdf',
      paidAt: null,
      testName: 'CBC',
      clinicName: 'Docita Clinic',
      patient: {
        id: 'patient-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: null,
      },
    });

    await expect(service.releaseResult('order-1', 'clinic-1')).rejects.toThrow(
      'Verify payment before releasing results to the patient',
    );
    expect(workflowRepository.markReleased).not.toHaveBeenCalled();
  });

  it('records payment but skips release when no result has been uploaded yet', async () => {
    const orderWithoutResult = new LabOrder(
      'order-1',
      'patient-1',
      'test-1',
      LabTestOrderStatus.ORDERED,
      'clinic-1',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Date('2026-07-01T09:00:00.000Z'),
    );
    const orderAfterPayment = new LabOrder(
      'order-1',
      'patient-1',
      'test-1',
      LabTestOrderStatus.PENDING,
      'clinic-1',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Date('2026-07-01T09:00:00.000Z'),
    );
    orderRepository.findOrderById
      .mockImplementationOnce(async () => orderWithoutResult)
      .mockImplementationOnce(async () => orderAfterPayment);

    await service.verifyPayment('order-1', 'clinic-1', {
      method: 'CARD',
      verifiedBy: 'staff-2',
    });

    expect(workflowRepository.verifyPayment).toHaveBeenCalledWith(
      'order-1',
      'clinic-1',
      { method: 'CARD', verifiedBy: 'staff-2' },
      expect.any(Date),
    );
    // markReleased should not fire — there's no resultUrl yet so canRelease() is false
    expect(workflowRepository.markReleased).not.toHaveBeenCalled();
  });
});
