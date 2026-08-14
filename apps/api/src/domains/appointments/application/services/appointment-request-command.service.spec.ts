import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentRequestStatus } from '@workspace/db';
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
    findMatchingAppointment: jest
      .fn<IAppointmentRequestRepository['findMatchingAppointment']>()
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
        responseMessage: 'Booked appointment appt-existing',
      }),
    );
  });

  it('creates a new appointment when none matches and marks the request approved', async () => {
    ctx.repo.findByIdAndClinic.mockResolvedValueOnce(pendingRequest);

    await ctx.service.approveRequest('req-1', 'clinic-1', 'staff-1', approval);

    expect(ctx.appointmentService.createAppointment).toHaveBeenCalledTimes(1);
    expect(ctx.repo.markReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AppointmentRequestStatus.APPROVED,
        responseMessage: 'Booked appointment appt-new',
      }),
    );
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
      }),
    );
  });
});
