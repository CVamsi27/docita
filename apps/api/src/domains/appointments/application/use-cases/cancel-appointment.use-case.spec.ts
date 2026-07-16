import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CancelAppointmentUseCase } from './cancel-appointment.use-case';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import type { IAppointmentWriteRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type { IClock } from '@/shared/common/ports/clock.port';

const NOW = new Date('2026-05-19T12:00:00.000Z');

function makeAppointment(
  status: AppointmentStatus = AppointmentStatus.scheduled(),
): Appointment {
  return new Appointment({
    id: 'appt-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date('2026-05-16T09:00:00Z'),
    endTime: new Date('2026-05-16T09:30:00Z'),
    status,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
    version: 1,
  });
}

describe('CancelAppointmentUseCase', () => {
  let useCase: CancelAppointmentUseCase;
  let writeRepository: {
    update: ReturnType<typeof jest.fn>;
  };
  const clock: IClock = { now: () => NOW };

  beforeEach(() => {
    writeRepository = {
      update: jest
        .fn<IAppointmentWriteRepository['update']>()
        .mockResolvedValue(undefined),
    };
    useCase = new CancelAppointmentUseCase(
      writeRepository as unknown as IAppointmentWriteRepository,
      clock,
    );
  });

  it('cancels and persists the appointment', async () => {
    const appointment = makeAppointment();

    const result = await useCase.execute({
      appointment,
      reason: 'Patient requested',
    });

    expect(result.getStatus().isCancelled()).toBe(true);
    expect(writeRepository.update).toHaveBeenCalledWith(appointment);
  });

  it('rejects cancelling a completed appointment and does not persist', async () => {
    const appointment = makeAppointment(AppointmentStatus.completed());

    await expect(
      useCase.execute({ appointment, reason: 'Too late' }),
    ).rejects.toBeInstanceOf(InvariantViolationError);

    expect(writeRepository.update).not.toHaveBeenCalled();
    expect(appointment.getStatus().isCompleted()).toBe(true);
  });

  it('is idempotent when the appointment is already cancelled (still persists)', async () => {
    // The entity's cancel() returns early on already-cancelled (no-op).
    // The use case does not short-circuit, so update() is still invoked.
    // Documenting current behavior — caller is responsible for guarding
    // against duplicate cancellation at the command-service layer.
    const appointment = makeAppointment(AppointmentStatus.cancelled());

    const result = await useCase.execute({
      appointment,
      reason: 'Second attempt',
    });

    expect(result.getStatus().isCancelled()).toBe(true);
    expect(writeRepository.update).toHaveBeenCalledWith(appointment);
  });

  it('propagates repository failures and leaves the appointment in cancelled state in memory', async () => {
    // The use case mutates the entity before awaiting the repo write.
    // If the repo rejects, the in-memory entity stays cancelled while the
    // caller sees the error — caller's transactional boundary must reconcile.
    // This test documents that contract; do not change without coordinating
    // with AppointmentCommandService.cancelAppointment callers.
    const appointment = makeAppointment();
    const repoError = new Error('db unreachable');
    writeRepository.update.mockRejectedValueOnce(repoError);

    await expect(
      useCase.execute({ appointment, reason: 'Patient requested' }),
    ).rejects.toBe(repoError);

    expect(appointment.getStatus().isCancelled()).toBe(true);
  });

  it('passes an empty reason through without validation (current contract)', async () => {
    // Reason is intentionally not validated by the entity or use case.
    // Validated upstream by CancelAppointmentDto at the controller layer.
    // If a future change moves validation here, this test must be updated.
    const appointment = makeAppointment();

    const result = await useCase.execute({ appointment, reason: '' });

    expect(result.getStatus().isCancelled()).toBe(true);
    expect(writeRepository.update).toHaveBeenCalledWith(appointment);
  });

  it('runs cancel() before persisting so a failure leaves no half-written appointment', async () => {
    // Sanity check: the use case MUST call cancel() (which throws on completed)
    // BEFORE calling repo.update(). A regression that reorders these would
    // write a "cancelled" completed appointment to the DB.
    const appointment = makeAppointment(AppointmentStatus.completed());

    await expect(
      useCase.execute({ appointment, reason: 'late' }),
    ).rejects.toBeInstanceOf(InvariantViolationError);

    expect(writeRepository.update).not.toHaveBeenCalled();
  });
});
