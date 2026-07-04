import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { UpdateAppointmentDetailsUseCase } from './update-appointment-details.use-case';
import type { IAppointmentWriteRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import type { AppointmentMetricsService } from '@/domains/appointments/application/services/appointment-metrics.service';

function makeCtx() {
  const writeRepository = {
    applyPatch: jest
      .fn<IAppointmentWriteRepository['applyPatch']>()
      .mockResolvedValue(1),
  };
  const schedulingRules = {
    validateAppointmentOverlap: jest
      .fn<AppointmentSchedulingRulesService['validateAppointmentOverlap']>()
      .mockResolvedValue({ hasConflict: false }),
  };
  const metricsService = {
    recordObservationMetrics: jest
      .fn<AppointmentMetricsService['recordObservationMetrics']>()
      .mockResolvedValue(undefined),
  };
  const eventEmitter = {
    emit: jest.fn<(event: string | symbol, payload: unknown) => boolean>(),
  };

  const useCase = new UpdateAppointmentDetailsUseCase(
    writeRepository as unknown as IAppointmentWriteRepository,
    schedulingRules as unknown as AppointmentSchedulingRulesService,
    metricsService as unknown as AppointmentMetricsService,
    eventEmitter as unknown as EventEmitter2,
  );

  const appointment = {
    id: 'appt-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date('2026-06-01T09:00:00Z'),
    endTime: new Date('2026-06-01T09:30:00Z'),
  };

  return {
    useCase,
    writeRepository,
    schedulingRules,
    metricsService,
    eventEmitter,
    appointment,
  };
}

describe('UpdateAppointmentDetailsUseCase', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('skips the overlap check for a non-schedule patch (e.g. notes only)', async () => {
    await ctx.useCase.execute({
      appointmentId: 'appt-1',
      clinicId: 'clinic-1',
      data: { observations: 'Stable' },
      appointment: ctx.appointment,
    });

    expect(
      ctx.schedulingRules.validateAppointmentOverlap,
    ).not.toHaveBeenCalled();
    expect(ctx.metricsService.recordObservationMetrics).toHaveBeenCalledTimes(
      1,
    );
  });

  it('rejects a schedule change that overlaps another appointment', async () => {
    ctx.schedulingRules.validateAppointmentOverlap.mockResolvedValueOnce({
      hasConflict: true,
    });

    await expect(
      ctx.useCase.execute({
        appointmentId: 'appt-1',
        clinicId: 'clinic-1',
        data: { startTime: '2026-06-01T10:00:00Z' },
        appointment: ctx.appointment,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.writeRepository.applyPatch).not.toHaveBeenCalled();
  });

  it('conflict-checks a doctor reassignment even when times are untouched (double-booking loophole)', async () => {
    ctx.schedulingRules.validateAppointmentOverlap.mockResolvedValueOnce({
      hasConflict: true,
    });

    await expect(
      ctx.useCase.execute({
        appointmentId: 'appt-1',
        clinicId: 'clinic-1',
        data: { doctorId: 'doctor-2' },
        appointment: ctx.appointment,
      }),
    ).rejects.toThrow('Doctor has conflicting appointment');

    // The overlap check runs for the NEW doctor over the EXISTING slot.
    expect(ctx.schedulingRules.validateAppointmentOverlap).toHaveBeenCalledWith(
      'doctor-2',
      'clinic-1',
      ctx.appointment.startTime,
      ctx.appointment.endTime,
      'appt-1',
    );
    expect(ctx.writeRepository.applyPatch).not.toHaveBeenCalled();
  });

  it('does not re-check overlap when doctorId is unchanged', async () => {
    await ctx.useCase.execute({
      appointmentId: 'appt-1',
      clinicId: 'clinic-1',
      data: { doctorId: 'doctor-1' },
      appointment: ctx.appointment,
    });

    expect(
      ctx.schedulingRules.validateAppointmentOverlap,
    ).not.toHaveBeenCalled();
  });

  it('throws NotFound when the appointment row is gone', async () => {
    ctx.writeRepository.applyPatch.mockResolvedValueOnce(0);

    await expect(
      ctx.useCase.execute({
        appointmentId: 'appt-1',
        clinicId: 'clinic-1',
        data: { observations: 'note' },
        appointment: ctx.appointment,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('emits APPOINTMENT_COMPLETED when the status becomes completed', async () => {
    await ctx.useCase.execute({
      appointmentId: 'appt-1',
      clinicId: 'clinic-1',
      data: { status: 'completed' },
      appointment: ctx.appointment,
    });

    expect(ctx.eventEmitter.emit).toHaveBeenCalledWith(
      ApplicationEvents.APPOINTMENT_COMPLETED,
      { appointmentId: 'appt-1', clinicId: 'clinic-1' },
    );
  });

  it('records observation + consultation-note metrics when present', async () => {
    await ctx.useCase.execute({
      appointmentId: 'appt-1',
      clinicId: 'clinic-1',
      data: { observations: 'BP normal', consultationNotes: 'Follow up 1w' },
      appointment: ctx.appointment,
    });

    const call = ctx.metricsService.recordObservationMetrics.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      appointmentId: 'appt-1',
    });
    expect(call?.metrics).toHaveLength(2);
  });
});
