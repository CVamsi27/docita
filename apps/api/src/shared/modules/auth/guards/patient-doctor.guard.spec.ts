import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType } from '@/test-utils';
import { PatientDoctorGuard } from './patient-doctor.guard';

function createContext(
  user: Record<string, unknown>,
  params: Record<string, string>,
): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => ({ user, params }),
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

describe('PatientDoctorGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let prisma: {
    patient: {
      findFirst: jest.MockedFunction<
        (...args: unknown[]) => Promise<{ id: string } | null>
      >;
    };
    patientDoctor: {
      findFirst: jest.MockedFunction<
        (...args: unknown[]) => Promise<{ id: string } | null>
      >;
    };
  };
  let guard: PatientDoctorGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      patientDoctor: {
        findFirst: jest.fn(),
      },
    };
    guard = new PatientDoctorGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof PatientDoctorGuard>[1]>(prisma),
    );
  });

  it('allows request when doctor-patient scoping is not enabled', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(
      guard.canActivate(
        createContext(
          { role: Role.DOCTOR, sub: 'doctor-1' },
          { patientId: 'p1' },
        ),
      ),
    ).resolves.toBe(true);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientDoctor.findFirst).not.toHaveBeenCalled();
  });

  it('allows admin-type roles to bypass doctor-patient relationship checks', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(
      guard.canActivate(
        createContext(
          { role: Role.ADMIN, sub: 'admin-1' },
          { patientId: 'p1' },
        ),
      ),
    ).resolves.toBe(true);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientDoctor.findFirst).not.toHaveBeenCalled();
  });

  it('allows request when patientId is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(
      guard.canActivate(
        createContext({ role: Role.DOCTOR, sub: 'doctor-1' }, {}),
      ),
    ).resolves.toBe(true);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientDoctor.findFirst).not.toHaveBeenCalled();
  });

  it('allows patient role when patient record is linked to user', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    prisma.patient.findFirst.mockResolvedValue({ id: 'p1' });

    await expect(
      guard.canActivate(
        createContext(
          { role: Role.PATIENT, sub: 'user-1' },
          { patientId: 'p1' },
        ),
      ),
    ).resolves.toBe(true);

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'user-1' },
      select: { id: true },
    });
  });

  it('blocks patient role when patient record is not linked', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext(
          { role: Role.PATIENT, sub: 'user-1' },
          { patientId: 'p1' },
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows doctor role when active patient relationship exists', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    prisma.patientDoctor.findFirst.mockResolvedValue({ id: 'rel-1' });

    await expect(
      guard.canActivate(
        createContext(
          { role: Role.DOCTOR, sub: 'doctor-1' },
          { patientId: 'p1' },
        ),
      ),
    ).resolves.toBe(true);

    expect(prisma.patientDoctor.findFirst).toHaveBeenCalledWith({
      where: {
        patientId: 'p1',
        doctorId: 'doctor-1',
        isActive: true,
      },
      select: { id: true },
    });
  });

  it('blocks doctor role when active relationship does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    prisma.patientDoctor.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext(
          { role: Role.DOCTOR, sub: 'doctor-1' },
          { patientId: 'p1' },
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
