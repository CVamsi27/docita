import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppointmentService } from './appointment.service';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { CreateAppointmentUseCase } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

describe('AppointmentService metric persistence', () => {
  const mockAppointmentRepository = {
    findById: jest.fn<IAppointmentRepository['findById']>(),
    findAll: jest.fn<IAppointmentRepository['findAll']>(),
    save: jest.fn<IAppointmentRepository['save']>(),
    update: jest.fn<IAppointmentRepository['update']>(),
    delete: jest.fn<IAppointmentRepository['delete']>(),
    findByPatientId: jest.fn<IAppointmentRepository['findByPatientId']>(),
    findByDoctorId: jest.fn<IAppointmentRepository['findByDoctorId']>(),
    exists: jest.fn<IAppointmentRepository['exists']>(),
    findAppointmentsForSlots:
      jest.fn<IAppointmentRepository['findAppointmentsForSlots']>(),
  } satisfies IAppointmentRepository;

  const mockCreateAppointmentUseCase = {
    execute: jest.fn<CreateAppointmentUseCase['execute']>(),
  };

  const mockEventEmitter = {
    emit: jest.fn<EventEmitter2['emit']>().mockImplementation(() => true),
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
  const appointmentRepository = mockAppointmentRepository;
  const createAppointmentUseCase = Object.create(
    CreateAppointmentUseCase.prototype,
  ) as CreateAppointmentUseCase;
  createAppointmentUseCase.execute = mockCreateAppointmentUseCase.execute;
  const eventEmitter = Object.create(EventEmitter2.prototype) as EventEmitter2;
  eventEmitter.emit = mockEventEmitter.emit;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(async (operations: unknown) =>
      Promise.all(operations as Promise<unknown>[]),
    );
    mockPrisma.patientMetricRecord.create.mockResolvedValue({});
    mockPrisma.metricDefinition.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.metricCategory.findFirst.mockResolvedValue({ id: 'cat-1' });

    const prisma = Object.create(PrismaService.prototype) as PrismaService;
    Object.defineProperties(prisma, {
      appointment: { value: mockPrisma.appointment, writable: true },
      vitalSign: { value: mockPrisma.vitalSign, writable: true },
      metricCategory: { value: mockPrisma.metricCategory, writable: true },
      metricDefinition: { value: mockPrisma.metricDefinition, writable: true },
      patientMetricRecord: {
        value: mockPrisma.patientMetricRecord,
        writable: true,
      },
      $transaction: { value: mockPrisma.$transaction, writable: true },
    });

    service = new AppointmentService(
      appointmentRepository,
      createAppointmentUseCase,
      prisma,
      eventEmitter,
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
    mockAppointmentRepository.findById.mockResolvedValue(
      new Appointment({
        id: 'apt-2',
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        startTime: new Date('2026-04-01T11:00:00.000Z'),
        endTime: new Date('2026-04-01T11:30:00.000Z'),
        status: AppointmentStatus.confirmed(),
        createdAt: new Date('2026-04-01T10:45:00.000Z'),
        updatedAt: new Date('2026-04-01T10:45:00.000Z'),
        version: 1,
      }),
    );

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
