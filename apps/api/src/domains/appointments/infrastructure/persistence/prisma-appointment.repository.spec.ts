import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppointmentStatus } from '@workspace/db';
import { PrismaAppointmentReadRepository } from './prisma-appointment-read.repository';
import { PrismaAppointmentWriteRepository } from './prisma-appointment-write.repository';
import { PrismaAppointmentRepository } from './prisma-appointment.repository';
import { PrismaService } from '@/prisma/prisma.service';

describe('PrismaAppointmentRepository', () => {
  const mockAppointmentCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const mockReadClient = {
    appointment: {
      count: mockAppointmentCount,
      findMany: mockAppointmentFindMany,
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const mockPrismaService = {
    getReadClient: jest.fn().mockReturnValue(mockReadClient),
    appointment: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  let repository: PrismaAppointmentRepository;

  const baseAppointmentRow = {
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date('2026-04-01T09:00:00.000Z'),
    endTime: new Date('2026-04-01T09:30:00.000Z'),
    status: AppointmentStatus.SCHEDULED,
    notes: null,
    consultationNotes: null,
    observations: null,
    chiefComplaint: null,
    treatmentHistory: null,
    clinicalImpression: null,
    differentialDiagnosis: null,
    finalDiagnosis: null,
    followUpPlan: null,
    type: 'consultation',
    createdAt: new Date('2026-04-01T08:00:00.000Z'),
    updatedAt: new Date('2026-04-01T08:00:00.000Z'),
    version: 1,
    patient: {
      id: 'patient-1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '9999999999',
    },
    doctor: {
      id: 'doctor-1',
      name: 'Dr. Smith',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    Object.defineProperties(prismaService, {
      getReadClient: {
        value: mockPrismaService.getReadClient,
        writable: true,
      },
      appointment: {
        value: mockPrismaService.appointment,
        writable: true,
      },
    });
    repository = new PrismaAppointmentRepository(
      new PrismaAppointmentReadRepository(prismaService),
      new PrismaAppointmentWriteRepository(prismaService),
    );
  });

  it('uses cursor pagination with skip and deterministic ordering', async () => {
    mockAppointmentCount.mockResolvedValue(3);
    mockAppointmentFindMany.mockResolvedValue([
      {
        ...baseAppointmentRow,
        id: 'appointment-2',
      },
      {
        ...baseAppointmentRow,
        id: 'appointment-3',
        startTime: new Date('2026-04-01T09:30:00.000Z'),
        endTime: new Date('2026-04-01T10:00:00.000Z'),
      },
      {
        ...baseAppointmentRow,
        id: 'appointment-4',
        startTime: new Date('2026-04-01T10:00:00.000Z'),
        endTime: new Date('2026-04-01T10:30:00.000Z'),
      },
    ]);

    const result = await repository.findAll({
      clinicId: 'clinic-1',
      cursor: 'appointment-1',
      limit: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('appointment-3');
    expect(result.count).toBe(3);
    expect(mockPrismaService.getReadClient).toHaveBeenCalled();
    expect(mockAppointmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        cursor: { id: 'appointment-1' },
        skip: 1,
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('returns no next cursor when fetched page is complete', async () => {
    mockAppointmentCount.mockResolvedValue(1);
    mockAppointmentFindMany.mockResolvedValue([
      {
        ...baseAppointmentRow,
        id: 'appointment-1',
      },
    ]);

    const result = await repository.findAll({
      clinicId: 'clinic-1',
      limit: 2,
    });

    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('uses interval overlap when intersectCalendarRange is set', async () => {
    mockAppointmentCount.mockResolvedValue(0);
    mockAppointmentFindMany.mockResolvedValue([]);
    const startDate = new Date('2026-05-06T18:30:00.000Z');
    const endDate = new Date('2026-05-07T18:30:00.000Z');

    await repository.findAll({
      clinicId: 'clinic-1',
      startDate,
      endDate,
      intersectCalendarRange: true,
      limit: 20,
    });

    expect(mockAppointmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ startTime: { lt: endDate } }, { endTime: { gt: startDate } }],
        }),
      }),
    );
  });
});
