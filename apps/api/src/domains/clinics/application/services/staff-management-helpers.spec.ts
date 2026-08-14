import { Role } from '@workspace/db';
import {
  actorMayAssignMemberRoles,
  mapClinicMemberRoleToPrisma,
  isClinicFrontDesk,
} from './staff-management-helpers';
import type { ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';

describe('actorMayAssignMemberRoles', () => {
  it('returns true for ADMIN role', () => {
    expect(actorMayAssignMemberRoles(Role.ADMIN)).toBe(true);
  });

  it('returns true for ADMIN_DOCTOR role', () => {
    expect(actorMayAssignMemberRoles(Role.ADMIN_DOCTOR)).toBe(true);
  });

  it('returns false for DOCTOR role', () => {
    expect(actorMayAssignMemberRoles(Role.DOCTOR)).toBe(false);
  });

  it('returns false for NURSE role', () => {
    expect(actorMayAssignMemberRoles(Role.NURSE)).toBe(false);
  });

  it('returns false for RECEPTIONIST role', () => {
    expect(actorMayAssignMemberRoles(Role.RECEPTIONIST)).toBe(false);
  });

  it('returns false for LAB role', () => {
    expect(actorMayAssignMemberRoles(Role.LAB)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(actorMayAssignMemberRoles(undefined)).toBe(false);
  });
});

describe('mapClinicMemberRoleToPrisma', () => {
  it('maps DOCTOR to Role.DOCTOR', () => {
    expect(mapClinicMemberRoleToPrisma('DOCTOR')).toBe(Role.DOCTOR);
  });

  it('maps NURSE to Role.NURSE', () => {
    expect(mapClinicMemberRoleToPrisma('NURSE')).toBe(Role.NURSE);
  });

  it('maps RECEPTIONIST to Role.RECEPTIONIST', () => {
    expect(mapClinicMemberRoleToPrisma('RECEPTIONIST')).toBe(Role.RECEPTIONIST);
  });

  it('maps ADMIN to Role.ADMIN', () => {
    expect(mapClinicMemberRoleToPrisma('ADMIN')).toBe(Role.ADMIN);
  });

  it('maps LAB to Role.LAB', () => {
    expect(mapClinicMemberRoleToPrisma('LAB')).toBe(Role.LAB);
  });

  it('maps ADMIN_DOCTOR to Role.ADMIN_DOCTOR', () => {
    expect(mapClinicMemberRoleToPrisma('ADMIN_DOCTOR')).toBe(Role.ADMIN_DOCTOR);
  });
});

describe('isClinicFrontDesk', () => {
  function createMockPersistence(
    clinicData: {
      tier?: string;
      planMode?: string;
    } | null,
  ): ClinicPersistencePort {
    return {
      clinic: {
        findUnique: jest.fn().mockResolvedValue(clinicData),
      },
    } as unknown as ClinicPersistencePort;
  }

  it('returns true for a clinic with FRONT_DESK plan mode', async () => {
    const persistence = createMockPersistence({
      tier: 'ESSENTIAL',
      planMode: 'FRONT_DESK',
    });
    const result = await isClinicFrontDesk(persistence, 'clinic-1');
    expect(result).toBe(true);
  });

  it('returns false for a clinic with FULL plan mode', async () => {
    const persistence = createMockPersistence({
      tier: 'ESSENTIAL',
      planMode: 'FULL',
    });
    const result = await isClinicFrontDesk(persistence, 'clinic-1');
    expect(result).toBe(false);
  });

  it('returns false when clinic is not found (defaults to STARTER)', async () => {
    const persistence = createMockPersistence(null);
    const result = await isClinicFrontDesk(persistence, 'nonexistent');
    expect(result).toBe(false);
  });

  it('calls findUnique with the correct clinicId', async () => {
    const persistence = createMockPersistence(null);
    await isClinicFrontDesk(persistence, 'clinic-42');
    expect(persistence.clinic.findUnique).toHaveBeenCalledWith({
      where: { id: 'clinic-42' },
      select: { tier: true, planMode: true },
    });
  });
});
