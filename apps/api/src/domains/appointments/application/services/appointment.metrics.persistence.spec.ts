import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppointmentService } from './appointment.service';

describe('AppointmentService metric persistence', () => {
  const mockAppointmentRepository = {
    findById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockCreateAppointmentUseCase = {
    execute: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockEventEmitter = {
    emit: jest.fn<(...args: unknown[]) => unknown>(),
  };

  const mockPrisma = {
    appointment: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    vitalSign: {
      upsert: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    metricCategory: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    metricDefinition: {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    patientMetricRecord: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  let service: AppointmentService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(async (operations: unknown) =>
      Promise.all(operations as Promise<unknown>[]),
    );
    mockPrisma.patientMetricRecord.create.mockResolvedValue({});
    mockPrisma.metricDefinition.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.metricCategory.findFirst.mockResolvedValue({ id: 'cat-1' });

    service = new AppointmentService(
      mockAppointmentRepository as never,
      mockCreateAppointmentUseCase as never,
      mockPrisma as never,
      mockEventEmitter as never,
    );
  });

  it('batches vitals metric writes in a single transaction', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
    });
    mockPrisma.vitalSign.upsert.mockResolvedValue({ id: 'vital-1' });
    mockPrisma.metricDefinition.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'def-height', key: 'height' },
        { id: 'def-weight', key: 'weight' },
      ]);

    await service.createVitals('apt-1', 'clinic-1', {
      height: 170,
      weight: 70,
    });

    expect(mockPrisma.metricCategory.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.metricDefinition.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.metricDefinition.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ key: 'height' }),
          expect.objectContaining({ key: 'weight' }),
        ]),
        skipDuplicates: true,
      }),
    );
    expect(mockPrisma.patientMetricRecord.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('batches observation metrics for appointment detail updates', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-2',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
    });
    mockPrisma.appointment.update.mockResolvedValue({});
    mockPrisma.metricDefinition.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'def-observations', key: 'observations' },
        { id: 'def-consultation-notes', key: 'consultation_notes' },
      ]);
    mockAppointmentRepository.findById.mockResolvedValue({
      id: 'apt-2',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'IN_PROGRESS',
    });

    await service.updateAppointmentDetails('apt-2', 'clinic-1', {
      observations: 'Mild fever',
      consultationNotes: 'Hydration advised',
    });

    expect(mockPrisma.metricCategory.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.metricDefinition.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.patientMetricRecord.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
