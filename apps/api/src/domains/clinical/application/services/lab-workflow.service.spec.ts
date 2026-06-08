import { BadRequestException } from '@nestjs/common';
import { LabWorkflowCommandService } from './lab-workflow-command.service';
import type { LabWorkflowRepository } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import type { LabDirectoryRepository } from '@/domains/clinical/core/repositories/lab-directory.repository.interface';
import type { LabOrderRepository } from '@/domains/clinical/core/repositories/lab-order.repository.interface';
import type { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import type { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';

const NOW = new Date('2026-06-05T10:00:00Z');

function makeService(overrides?: {
  releaseContext?: unknown;
  supportsSignedUrls?: boolean;
}) {
  const markReleased = jest.fn().mockResolvedValue(undefined);
  const findReleaseContext = jest.fn().mockResolvedValue(
    overrides && 'releaseContext' in overrides
      ? overrides.releaseContext
      : {
          id: 'order-1',
          clinicId: 'clinic-1',
          status: 'RESULT_READY',
          resultUrl: 'lab-results/report.pdf',
          paidAt: NOW,
          testName: 'Complete Blood Count',
          clinicName: 'Docita Clinic',
          patient: {
            id: 'patient-1',
            firstName: 'Asha',
            lastName: 'Rao',
            phoneNumber: '+919999999999',
          },
        },
  );

  const workflowRepository = {
    findReleaseContext,
    markReleased,
  } as unknown as LabWorkflowRepository;
  const directoryRepository = {} as unknown as LabDirectoryRepository;
  const orderRepository = {} as unknown as LabOrderRepository;

  const generateSignedUrl = jest
    .fn()
    .mockResolvedValue('https://signed.example/report.pdf?sig=abc');
  const storageProvider = {
    supportsSignedUrls: overrides?.supportsSignedUrls ?? true,
    generateSignedUrl,
  } as unknown as StorageProvider;

  const execute = jest.fn().mockResolvedValue({ messageId: 'm1' });
  const sendMessage = { execute } as unknown as SendMessageUseCase;

  const emit = jest.fn();
  const eventEmitter = { emit } as never;

  const clock = { now: () => NOW };

  const service = new LabWorkflowCommandService(
    workflowRepository,
    directoryRepository,
    orderRepository,
    storageProvider,
    sendMessage,
    eventEmitter,
    clock,
  );

  return { service, execute, markReleased, emit, generateSignedUrl };
}

describe('LabWorkflowCommandService.releaseResult', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the lab_result_ready template with a signed link, then marks released', async () => {
    const { service, execute, markReleased, emit, generateSignedUrl } =
      makeService();

    await service.releaseResult('order-1', 'clinic-1');

    expect(generateSignedUrl).toHaveBeenCalledWith(
      'lab-results/report.pdf',
      expect.any(Number),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    const payload = execute.mock.calls[0][0];
    expect(payload.templateName).toBe('lab_result_ready');
    expect(payload.recipientPhone).toBe('+919999999999');
    expect(payload.variables.resultLink).toBe(
      'https://signed.example/report.pdf?sig=abc',
    );
    expect(payload.variables.testName).toBe('Complete Blood Count');
    expect(markReleased).toHaveBeenCalledWith('order-1', 'clinic-1', NOW);
    expect(emit).toHaveBeenCalled();
  });

  it('refuses to release when payment is not verified', async () => {
    const { service, execute, markReleased } = makeService({
      releaseContext: {
        id: 'order-1',
        clinicId: 'clinic-1',
        status: 'RESULT_READY',
        resultUrl: 'lab-results/report.pdf',
        paidAt: null,
        testName: 'CBC',
        clinicName: 'Docita',
        patient: {
          id: 'p1',
          firstName: 'A',
          lastName: 'B',
          phoneNumber: '+910000000000',
        },
      },
    });

    await expect(service.releaseResult('order-1', 'clinic-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
    expect(markReleased).not.toHaveBeenCalled();
  });

  it('refuses to release when no result is uploaded', async () => {
    const { service, markReleased } = makeService({
      releaseContext: {
        id: 'order-1',
        clinicId: 'clinic-1',
        status: 'PENDING',
        resultUrl: null,
        paidAt: NOW,
        testName: 'CBC',
        clinicName: 'Docita',
        patient: {
          id: 'p1',
          firstName: 'A',
          lastName: 'B',
          phoneNumber: '+910000000000',
        },
      },
    });

    await expect(service.releaseResult('order-1', 'clinic-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(markReleased).not.toHaveBeenCalled();
  });
});
