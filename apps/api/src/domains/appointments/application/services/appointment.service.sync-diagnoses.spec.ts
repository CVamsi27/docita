import { describe, expect, it, jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentService } from './appointment.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';
import { SyncAppointmentDiagnosesUseCase } from '@/domains/appointments/application/use-cases/sync-appointment-diagnoses.use-case';
import { createStubAppointmentWriteUseCases } from './appointment-use-case.stubs';

describe('AppointmentService.syncDiagnoses', () => {
  const appointmentRepository = {} as never;
  const createAppointmentUseCase = { execute: jest.fn() } as never;
  const eventEmitter = {
    emit: jest.fn(),
    emitAsync: jest.fn(),
    addListener: jest.fn(),
    on: jest.fn(),
    prependListener: jest.fn(),
  } as unknown as EventEmitter2;

  const findFirstMock =
    jest.fn<
      (...args: unknown[]) => Promise<{ id: string; clinicId: string } | null>
    >();
  const findManyMock = jest.fn<
    (...args: unknown[]) => Promise<
      Array<{
        icdCodeId: string | null;
        notes: string | null;
        isPrimary: boolean;
      }>
    >
  >();
  const deleteManyMock =
    jest.fn<(...args: unknown[]) => Promise<{ count: number }>>();
  const createManyMock =
    jest.fn<(...args: unknown[]) => Promise<{ count: number }>>();

  const txProxy = {
    diagnosis: {
      deleteMany: deleteManyMock,
      createMany: createManyMock,
    },
  };

  const prisma = {
    appointment: {
      findFirst: findFirstMock,
    },
    diagnosis: {
      findMany: findManyMock,
    },
    $transaction: jest.fn(
      async (callback: (tx: typeof txProxy) => Promise<unknown>) =>
        callback(txProxy),
    ),
  } as never;

  const metricsService = Object.create(
    AppointmentMetricsService.prototype,
  ) as AppointmentMetricsService;
  Object.defineProperty(metricsService, 'prisma', {
    value: prisma,
    writable: true,
  });

  const diagnosisService = new AppointmentDiagnosisService(
    new SyncAppointmentDiagnosesUseCase(prisma),
  );

  const writeUseCaseStubs = createStubAppointmentWriteUseCases();

  const service = new AppointmentService(
    appointmentRepository,
    appointmentRepository,
    createAppointmentUseCase,
    writeUseCaseStubs.cancelAppointmentUseCase,
    writeUseCaseStubs.rescheduleAppointmentUseCase,
    writeUseCaseStubs.startConsultationUseCase,
    writeUseCaseStubs.updateAppointmentDetailsUseCase,
    prisma,
    eventEmitter,
    metricsService,
    diagnosisService,
  );

  it('marks the first coded diagnosis as primary after uncoded rows are filtered out', async () => {
    findFirstMock.mockResolvedValue({
      id: 'appt-1',
      clinicId: 'clinic-1',
    });
    findManyMock.mockResolvedValue([]);

    deleteManyMock.mockResolvedValue({ count: 0 });
    createManyMock.mockResolvedValue({ count: 2 });

    const result = await service.syncDiagnoses('appt-1', 'clinic-1', [
      {
        notes: 'uncoded row',
        isPrimary: true,
      },
      {
        icdCodeId: 'icd-1',
        notes: 'first coded row',
      },
      {
        icdCodeId: 'icd-2',
        notes: 'second coded row',
      },
    ]);

    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        {
          appointmentId: 'appt-1',
          icdCodeId: 'icd-1',
          notes: 'first coded row',
          isPrimary: true,
        },
        {
          appointmentId: 'appt-1',
          icdCodeId: 'icd-2',
          notes: 'second coded row',
          isPrimary: false,
        },
      ],
    });
    expect(result.skipped).toBe(false);
    expect(result.count).toBe(2);
    expect(result.contentHash).toBeDefined();
  });

  it('skips the write when the stored diagnoses already match the requested set', async () => {
    findFirstMock.mockResolvedValue({
      id: 'appt-2',
      clinicId: 'clinic-1',
    });
    findManyMock.mockResolvedValue([
      { icdCodeId: 'icd-1', notes: 'note a', isPrimary: true },
    ]);
    deleteManyMock.mockReset();
    createManyMock.mockReset();

    const result = await service.syncDiagnoses('appt-2', 'clinic-1', [
      { icdCodeId: 'icd-1', notes: 'note a', isPrimary: true },
    ]);

    expect(result.skipped).toBe(true);
    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(createManyMock).not.toHaveBeenCalled();
  });
});
