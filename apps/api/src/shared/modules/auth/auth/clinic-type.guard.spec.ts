import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClinicType } from '@workspace/db';
import { FacilityType } from '@workspace/types';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType, mockGetAllAndOverrideKeyMap } from '@/test-utils';
import { CLINIC_TYPES_KEY, FACILITY_TYPES_KEY } from './clinic-type.decorator';
import { ClinicTypeGuard, FacilityTypeGuard } from './clinic-type.guard';

function mockRequiredClinicTypes(
  mock: jest.MockedFunction<Reflector['getAllAndOverride']>,
  types: ClinicType[] | undefined,
): void {
  mockGetAllAndOverrideKeyMap(mock, [[CLINIC_TYPES_KEY, types]]);
}

function mockRequiredFacilityTypes(
  mock: jest.MockedFunction<Reflector['getAllAndOverride']>,
  types: FacilityType[] | undefined,
): void {
  mockGetAllAndOverrideKeyMap(mock, [[FACILITY_TYPES_KEY, types]]);
}

function createContext(user: unknown): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

describe('ClinicTypeGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let prisma: {
    clinic: {
      findUnique: jest.MockedFunction<
        (...args: unknown[]) => Promise<Record<string, unknown> | null>
      >;
    };
  };
  let clinicTypeGuard: ClinicTypeGuard;
  let facilityTypeGuard: FacilityTypeGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    prisma = {
      clinic: {
        findUnique: jest.fn(),
      },
    };
    clinicTypeGuard = new ClinicTypeGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof ClinicTypeGuard>[1]>(prisma),
    );
    facilityTypeGuard = new FacilityTypeGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof FacilityTypeGuard>[1]>(prisma),
    );
  });

  describe('clinic type checks', () => {
    it('allows request when no clinic type metadata is set', async () => {
      mockRequiredClinicTypes(reflector.getAllAndOverride, undefined);

      await expect(
        clinicTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).resolves.toBe(true);
      expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
    });

    it('blocks request when user has no clinic', async () => {
      mockRequiredClinicTypes(reflector.getAllAndOverride, [
        ClinicType.GENERAL,
      ]);

      await expect(
        clinicTypeGuard.canActivate(createContext({})),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks request when clinic is not found', async () => {
      mockRequiredClinicTypes(reflector.getAllAndOverride, [
        ClinicType.GENERAL,
      ]);
      prisma.clinic.findUnique.mockResolvedValue(null);

      await expect(
        clinicTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks request when clinic type does not match required type', async () => {
      mockRequiredClinicTypes(reflector.getAllAndOverride, [
        ClinicType.DENTAL,
      ]);
      prisma.clinic.findUnique.mockResolvedValue({
        type: ClinicType.GENERAL,
        name: 'Main Clinic',
      });

      await expect(
        clinicTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows request when clinic type matches required type', async () => {
      mockRequiredClinicTypes(reflector.getAllAndOverride, [
        ClinicType.GENERAL,
        ClinicType.DENTAL,
      ]);
      prisma.clinic.findUnique.mockResolvedValue({
        type: ClinicType.GENERAL,
        name: 'Main Clinic',
      });

      await expect(
        clinicTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).resolves.toBe(true);
    });
  });

  describe('facility type checks', () => {
    it('allows request when no facility type metadata is set', async () => {
      mockRequiredFacilityTypes(reflector.getAllAndOverride, undefined);

      await expect(
        facilityTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).resolves.toBe(true);
      expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
    });

    it('blocks request when facility type does not match', async () => {
      mockRequiredFacilityTypes(reflector.getAllAndOverride, [
        FacilityType.HOSPITAL,
      ]);
      prisma.clinic.findUnique.mockResolvedValue({
        facilityType: FacilityType.CLINIC,
        name: 'Main Clinic',
      });

      await expect(
        facilityTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows request when facility type matches', async () => {
      mockRequiredFacilityTypes(reflector.getAllAndOverride, [
        FacilityType.CLINIC,
      ]);
      prisma.clinic.findUnique.mockResolvedValue({
        facilityType: FacilityType.CLINIC,
        name: 'Main Clinic',
      });

      await expect(
        facilityTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).resolves.toBe(true);
    });
  });
});
