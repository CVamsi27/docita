import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { FollowUp } from '@workspace/db';
import { FollowUpCommandService } from './follow-up-command.service';
import type { IFollowUpRepository } from '@/domains/appointments/core/repositories/follow-up.repository.interface';

const asFollowUp = (partial: Partial<FollowUp>): FollowUp =>
  partial as unknown as FollowUp;

function makeCtx() {
  const followUpRepository = {
    create: jest
      .fn<IFollowUpRepository['create']>()
      .mockResolvedValue(asFollowUp({ id: 'fu-new' })),
    findByIdAndClinic: jest
      .fn<IFollowUpRepository['findByIdAndClinic']>()
      .mockResolvedValue(null),
    update: jest
      .fn<IFollowUpRepository['update']>()
      .mockResolvedValue(asFollowUp({ id: 'fu-1' })),
  };
  const service = new FollowUpCommandService(
    followUpRepository as unknown as IFollowUpRepository,
  );
  return { service, followUpRepository };
}

describe('FollowUpCommandService.create', () => {
  it('parses the scheduled date and forwards the payload to the repository', async () => {
    const { service, followUpRepository } = makeCtx();

    await service.create({
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      clinicId: 'clinic-1',
      scheduledDate: '2026-08-01T00:00:00.000Z',
      reason: 'Review labs',
    });

    expect(followUpRepository.create).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      clinicId: 'clinic-1',
      scheduledDate: new Date('2026-08-01T00:00:00.000Z'),
      reason: 'Review labs',
    });
  });
});

describe('FollowUpCommandService status transitions', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('book throws NotFound for a follow-up outside the clinic', async () => {
    await expect(
      ctx.service.book('fu-1', 'clinic-1', 'appt-2'),
    ).rejects.toThrow(NotFoundException);
    expect(ctx.followUpRepository.update).not.toHaveBeenCalled();
  });

  it('book links the booked appointment and flips status to BOOKED', async () => {
    ctx.followUpRepository.findByIdAndClinic.mockResolvedValueOnce(
      asFollowUp({ id: 'fu-1' }),
    );

    await ctx.service.book('fu-1', 'clinic-1', 'appt-2');

    expect(ctx.followUpRepository.update).toHaveBeenCalledWith('fu-1', {
      status: 'BOOKED',
      bookedAppointmentId: 'appt-2',
    });
  });

  it('complete flips status to COMPLETED', async () => {
    ctx.followUpRepository.findByIdAndClinic.mockResolvedValueOnce(
      asFollowUp({ id: 'fu-1' }),
    );

    await ctx.service.complete('fu-1', 'clinic-1');

    expect(ctx.followUpRepository.update).toHaveBeenCalledWith('fu-1', {
      status: 'COMPLETED',
    });
  });

  it('cancel flips status to CANCELLED', async () => {
    ctx.followUpRepository.findByIdAndClinic.mockResolvedValueOnce(
      asFollowUp({ id: 'fu-1' }),
    );

    await ctx.service.cancel('fu-1', 'clinic-1');

    expect(ctx.followUpRepository.update).toHaveBeenCalledWith('fu-1', {
      status: 'CANCELLED',
    });
  });

  it('complete throws NotFound and never updates when the follow-up is missing', async () => {
    await expect(ctx.service.complete('fu-x', 'clinic-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(ctx.followUpRepository.update).not.toHaveBeenCalled();
  });
});
