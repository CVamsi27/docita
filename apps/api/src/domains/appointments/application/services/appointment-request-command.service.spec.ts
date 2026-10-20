import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentRequestStatus, Prisma } from '@workspace/db';
import { createHash } from 'crypto';
import { AppointmentRequestCommandService } from './appointment-request-command.service';
import type {
  AppointmentRequestWithRelations,
  IAppointmentRequestRepository,
} from '@/domains/appointments/core/repositories/appointment-request.repository.interface';
import type { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import type { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import type { Appointment } from '@/domains/appointments/core/entities/appointment.entity';

const asRequest = (
  partial: Partial<AppointmentRequestWithRelations>,
): AppointmentRequestWithRelations =>
  partial as unknown as AppointmentRequestWithRelations;

const pendingRequest = asRequest({
  id: 'req-1',
  patientId: 'patient-1',
  clinicId: 'clinic-1',
  status: AppointmentRequestStatus.PENDING,
  reason: 'Cough',
  notes: null,
  createdAt: new Date('2026-07-01T00:00:00Z'),
});

function makeCtx() {
  const repo = {
    create: jest
      .fn<IAppointmentRequestRepository['create']>()
      .mockResolvedValue(asRequest({ id: 'req-new' })),
    findByIdAndClinic: jest
      .fn<IAppointmentRequestRepository['findByIdAndClinic']>()
      .mockResolvedValue(null),
    markReviewed: jest
      .fn<IAppointmentRequestRepository['markReviewed']>()
      .mockResolvedValue(asRequest({ id: 'req-1', patientId: 'patient-1' })),
    update: jest
      .fn<IAppointmentRequestRepository['update']>()
      .mockImplementation(async () => asRequest({ id: 'req-1' })),
    findMatchingAppointment: jest
      .fn<IAppointmentRequestRepository['findMatchingAppointment']>()
      .mockResolvedValue(null),
    findPendingBySlotKey: jest
      .fn<IAppointmentRequestRepository['findPendingBySlotKey']>()
      .mockResolvedValue(null),
    doctorBelongsToClinic: jest
      .fn<IAppointmentRequestRepository['doctorBelongsToClinic']>()
      .mockResolvedValue(true),
  };
  const appointmentService = {
    createAppointment: jest.fn(
      async () => ({ id: 'appt-new' }) as unknown as Appointment,
    ),
  };
  const staffNotifications = {
    notifyStaff: jest.fn(async () => undefined),
  };
  const service = new AppointmentRequestCommandService(
    repo as unknown as IAppointmentRequestRepository,
    appointmentService as unknown as AppointmentService,
    staffNotifications as unknown as StaffNotificationService,
  );
  return { service, repo, appointmentService, staffNotifications };
}

const approval = {
  doctorId: 'doctor-1',
  startTime: '2026-07-10T09:00:00Z',
  endTime: '2026-07-10T09:30:00Z',
};

describe('AppointmentRequestCommandService.createPatientRequest', () => {
  it('rejects a preferred doctor that does not belong to the clinic', async () => {
    const ctx = makeCtx();
    ctx.repo.doctorBelongsToClinic.mockResolvedValueOnce(false);

    await expect(
      ctx.service.createPatientRequest('patient-1', 'clinic-1', {
        preferredDoctorId: 'doctor-x',
        preferredDate: '2026-07-10T09:00:00Z',
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.repo.create).not.toHaveBeenCalled();
  });
});

const slotRequestInput = {
  preferredDoctorId: 'doctor-1',
  preferredDate: '2026-07-10T09:00:00Z',
  requestedSlotStart: '2026-07-10T09:00:00Z',
  requestedSlotEnd: '2026-07-10T09:30:00Z',
  reason: 'Cough',
} as never;

const slotKeyFor = (parts: string[]) =>
  createHash('sha256').update(parts.join('|')).digest('hex');

const uniqueConstraintError = (target: string[]) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });

describe('AppointmentRequestCommandService.createPatientRequest slot hold', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('returns the existing pending request for a retried submission of the same doctor and slot', async () => {
    ctx.repo.findPendingBySlotKey.mockResolvedValueOnce(pendingRequest);

    const response = await ctx.service.createPatientRequest(
      'patient-1',
      'clinic-1',
      slotRequestInput,
    );

    expect(response.id).toBe('req-1');
    expect(ctx.repo.create).not.toHaveBeenCalled();
    expect(ctx.staffNotifications.notifyStaff).not.toHaveBeenCalled();
  });

  it('stores a slot hold key derived from clinic, patient, doctor, and slot start', async () => {
    await ctx.service.createPatientRequest(
      'patient-1',
      'clinic-1',
      slotRequestInput,
    );

    expect(ctx.repo.findPendingBySlotKey).toHaveBeenCalledWith(
      slotKeyFor([
        'clinic-1',
        'patient-1',
        'doctor-1',
        '2026-07-10T09:00:00.000Z',
      ]),
    );
    expect(ctx.repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingSlotKey: slotKeyFor([
          'clinic-1',
          'patient-1',
          'doctor-1',
          '2026-07-10T09:00:00.000Z',
        ]),
      }),
    );
  });

  it('does not dedupe another patient, doctor, or time on the same key', async () => {
    await ctx.service.createPatientRequest(
      'patient-1',
      'clinic-1',
      slotRequestInput,
    );
    await ctx.service.createPatientRequest('patient-1', 'clinic-1', {
      ...(slotRequestInput as object),
      requestedSlotStart: '2026-07-10T10:00:00Z',
      requestedSlotEnd: '2026-07-10T10:30:00Z',
    } as never);
    await ctx.service.createPatientRequest(
      'patient-2',
      'clinic-1',
      slotRequestInput,
    );
    await ctx.service.createPatientRequest('patient-1', 'clinic-1', {
      ...(slotRequestInput as object),
      preferredDoctorId: 'doctor-2',
    } as never);

    const keys = ctx.repo.create.mock.calls.map(
      ([data]) => data.pendingSlotKey,
    );
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(4);
  });

  it('returns the winner when a concurrent submit claims the same slot (P2002 recovery)', async () => {
    ctx.repo.findPendingBySlotKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingRequest);
    ctx.repo.create.mockRejectedValueOnce(
      uniqueConstraintError(['pendingSlotKey']),
    );

    const response = await ctx.service.createPatientRequest(
      'patient-1',
      'clinic-1',
      slotRequestInput,
    );

    expect(response.id).toBe('req-1');
    expect(ctx.repo.findPendingBySlotKey).toHaveBeenCalledTimes(2);
    expect(ctx.staffNotifications.notifyStaff).not.toHaveBeenCalled();
  });

  it('rethrows a P2002 on an unrelated constraint instead of hiding it', async () => {
    const conflict = uniqueConstraintError(['somethingElse']);
    ctx.repo.create.mockRejectedValueOnce(conflict);

    await expect(
      ctx.service.createPatientRequest(
        'patient-1',
        'clinic-1',
        slotRequestInput,
      ),
    ).rejects.toBe(conflict);
    expect(ctx.repo.findPendingBySlotKey).toHaveBeenCalledTimes(1);
  });

  it('rethrows the slot P2002 when the winner cannot be re-read', async () => {
    const conflict = uniqueConstraintError(['pendingSlotKey']);
    ctx.repo.create.mockRejectedValueOnce(conflict);

    await expect(
      ctx.service.createPatientRequest(
        'patient-1',
        'clinic-1',
        slotRequestInput,
      ),
    ).rejects.toBe(conflict);
  });

  it('skips the slot hold when the request names no slot', async () => {
    await ctx.service.createPatientRequest('patient-1', 'clinic-1', {
      preferredDoctorId: 'doctor-1',
      preferredDate: '2026-07-10T09:00:00Z',
    } as never);

    expect(ctx.repo.findPendingBySlotKey).not.toHaveBeenCalled();
    expect(ctx.repo.create.mock.calls[0][0].pendingSlotKey).toBeUndefined();
  });

  it('skips the slot hold when the request names no doctor', async () => {
    await ctx.service.createPatientRequest('patient-1', 'clinic-1', {
      preferredDate: '2026-07-10T09:00:00Z',
      requestedSlotStart: '2026-07-10T09:00:00Z',
      requestedSlotEnd: '2026-07-10T09:30:00Z',
    } as never);

    expect(ctx.repo.findPendingBySlotKey).not.toHaveBeenCalled();
    expect(ctx.repo.create.mock.calls[0][0].pendingSlotKey).toBeUndefined();
  });
});

describe('AppointmentRequestCommandService.approveRequest', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound when the request does not exist', async () => {
    await expect(
      ctx.service.approveRequest('req-x', 'clinic-1', 'staff-1', approval),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects reviewing a request that is no longer pending (double-review loophole)', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(
      asRequest({
        ...pendingRequest,
        status: AppointmentRequestStatus.APPROVED,
      }),
    );

    await expect(
      ctx.service.approveRequest('req-1', 'clinic-1', 'staff-1', approval),
    ).rejects.toThrow('Only pending appointment requests can be reviewed');
    expect(ctx.repo.markReviewed).not.toHaveBeenCalled();
  });

  it('rejects an approval doctor outside the clinic', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);
    ctx.repo.doctorBelongsToClinic.mockResolvedValueOnce(false);

    await expect(
      ctx.service.approveRequest('req-1', 'clinic-1', 'staff-1', approval),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.appointmentService.createAppointment).not.toHaveBeenCalled();
  });

  it('reuses an already-matching appointment instead of double-booking', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);
    ctx.repo.findMatchingAppointment.mockResolvedValueOnce({
      id: 'appt-existing',
    });

    await ctx.service.approveRequest('req-1', 'clinic-1', 'staff-1', approval);

    expect(ctx.appointmentService.createAppointment).not.toHaveBeenCalled();
    expect(ctx.repo.markReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AppointmentRequestStatus.APPROVED,
        expectedStatus: AppointmentRequestStatus.PENDING,
      }),
    );
    expect(ctx.repo.update).toHaveBeenCalledWith('req-1', 'clinic-1', {
      responseMessage: 'Booked appointment appt-existing',
    });
  });

  it('creates a new appointment when none matches and marks the request approved', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);

    await ctx.service.approveRequest('req-1', 'clinic-1', 'staff-1', approval);

    expect(ctx.appointmentService.createAppointment).toHaveBeenCalledTimes(1);
    expect(ctx.repo.update).toHaveBeenCalledWith('req-1', 'clinic-1', {
      responseMessage: 'Booked appointment appt-new',
    });
  });

  it('does not book anything when a concurrent reviewer claimed the request first', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);
    ctx.repo.markReviewed.mockResolvedValueOnce(null);

    await expect(
      ctx.service.approveRequest('req-1', 'clinic-1', 'staff-1', approval),
    ).rejects.toThrow(ConflictException);
    expect(ctx.appointmentService.createAppointment).not.toHaveBeenCalled();
    expect(ctx.staffNotifications.notifyStaff).not.toHaveBeenCalled();
  });

  it('still approves when the staff notification fails (best effort)', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);
    ctx.staffNotifications.notifyStaff.mockRejectedValueOnce(
      new Error('notify down'),
    );

    await expect(
      ctx.service.approveRequest('req-1', 'clinic-1', 'staff-1', approval),
    ).resolves.toBeDefined();
    expect(ctx.repo.markReviewed).toHaveBeenCalledTimes(1);
  });
});

describe('AppointmentRequestCommandService.rejectRequest', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('rejects reviewing a non-pending request', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(
      asRequest({
        ...pendingRequest,
        status: AppointmentRequestStatus.REJECTED,
      }),
    );

    await expect(
      ctx.service.rejectRequest('req-1', 'clinic-1', 'staff-1', {
        responseMessage: 'No slots',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks the request rejected with the response message', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);

    await ctx.service.rejectRequest('req-1', 'clinic-1', 'staff-1', {
      responseMessage: 'No slots this week',
    });

    expect(ctx.repo.markReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AppointmentRequestStatus.REJECTED,
        responseMessage: 'No slots this week',
        expectedStatus: AppointmentRequestStatus.PENDING,
      }),
    );
  });

  it('rejects with a conflict when a concurrent reviewer claimed the request first', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);
    ctx.repo.markReviewed.mockResolvedValueOnce(null);

    await expect(
      ctx.service.rejectRequest('req-1', 'clinic-1', 'staff-1', {
        responseMessage: 'No slots',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
