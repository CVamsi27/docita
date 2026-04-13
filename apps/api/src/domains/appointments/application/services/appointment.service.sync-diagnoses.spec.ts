import { describe, expect, it, jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentService } from './appointment.service';

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

  const findUniqueMock = jest.fn<
    (...args: unknown[]) => Promise<{ id: string; clinicId: string } | null>
  >();
  const deleteManyMock = jest.fn<(...args: unknown[]) => Promise<{ count: number }>>();
  const createManyMock = jest.fn<(...args: unknown[]) => Promise<{ count: number }>>();

  const prisma = {
    appointment: {
      findUnique: findUniqueMock,
    },
    diagnosis: {
      deleteMany: deleteManyMock,
      createMany: createManyMock,
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  } as never;

  const service = new AppointmentService(
    appointmentRepository,
    createAppointmentUseCase,
    prisma,
    eventEmitter,
  );

  it('marks the first coded diagnosis as primary after uncoded rows are filtered out', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'appt-1',
      clinicId: 'clinic-1',
    });

    deleteManyMock.mockResolvedValue({ count: 0 });
    createManyMock.mockResolvedValue({ count: 2 });

    await service.syncDiagnoses('appt-1', 'clinic-1', [
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
  });
});
