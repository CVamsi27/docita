import { describe, expect, it } from '@jest/globals';
import { AppointmentStatus } from '@workspace/db';
import { RAJESH_APPOINTMENT_ID } from './seed-constants';
import { buildAppointmentPlans } from './seed-encounter-factory';
import { SEEDED_PATIENTS } from './seed-patient-factory';

describe('seed encounter factory', () => {
  it('builds 90 plans: 55 past + 9 today + 25 future + 1 canonical rajesh', () => {
    const plans = buildAppointmentPlans();
    expect(plans).toHaveLength(90);
    expect(plans.filter((p) => p.id.startsWith('seed-apt-past-'))).toHaveLength(
      55,
    );
    expect(
      plans.filter((p) => p.id.startsWith('seed-apt-today-')),
    ).toHaveLength(9);
    expect(
      plans.filter((p) => p.id.startsWith('seed-apt-future-')),
    ).toHaveLength(25);
    expect(plans.filter((p) => p.id === RAJESH_APPOINTMENT_ID)).toHaveLength(1);
  });

  it('uses globally unique plan ids', () => {
    const ids = buildAppointmentPlans().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every patientIndex in catalog bounds', () => {
    for (const p of buildAppointmentPlans()) {
      expect(p.patientIndex).toBeGreaterThanOrEqual(0);
      expect(p.patientIndex).toBeLessThan(SEEDED_PATIENTS.length);
    }
  });

  it('spreads past plans across negative offsets with cancelled/no-show variety', () => {
    const past = buildAppointmentPlans().filter((p) =>
      p.id.startsWith('seed-apt-past-'),
    );
    expect(past.every((p) => p.daysOffset < 0)).toBe(true);
    expect(past.some((p) => p.status === AppointmentStatus.CANCELLED)).toBe(
      true,
    );
    expect(past.some((p) => p.status === AppointmentStatus.NO_SHOW)).toBe(true);
  });

  it('today plans mix statuses including one in progress and stay on offset 0', () => {
    const today = buildAppointmentPlans().filter((p) =>
      p.id.startsWith('seed-apt-today-'),
    );
    expect(today.every((p) => p.daysOffset === 0)).toBe(true);
    expect(today.every((p) => p.doctorKey === 'admin')).toBe(true);
    expect(today.some((p) => p.status === AppointmentStatus.IN_PROGRESS)).toBe(
      true,
    );
    expect(today.some((p) => p.status === AppointmentStatus.COMPLETED)).toBe(
      true,
    );
  });

  it('future plans land on positive offsets with the documented status mix', () => {
    const future = buildAppointmentPlans().filter((p) =>
      p.id.startsWith('seed-apt-future-'),
    );
    expect(future.every((p) => p.daysOffset > 0)).toBe(true);
    // The original status cycle ends in CANCELLED (every 8th plan), so a few
    // future slots are cancelled rather than open — matching the pre-extraction
    // seed exactly.
    expect(future.some((p) => p.status === AppointmentStatus.SCHEDULED)).toBe(
      true,
    );
    expect(future.some((p) => p.status === AppointmentStatus.CONFIRMED)).toBe(
      true,
    );
    for (const p of future) {
      expect([
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ]).toContain(p.status);
    }
  });

  it('the canonical rajesh plan is a completed consultation for patient 0', () => {
    const rajesh = buildAppointmentPlans().find(
      (p) => p.id === RAJESH_APPOINTMENT_ID,
    );
    expect(rajesh).toBeDefined();
    expect(rajesh!.patientIndex).toBe(0);
    expect(rajesh!.status).toBe(AppointmentStatus.COMPLETED);
    expect(rajesh!.type).toBe('consultation');
  });
});
