import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClinicType } from '@workspace/db';
import { FacilityType } from '@workspace/types';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType } from '@/test-utils/as-type';
import { mockGetAllAndOverrideKeyBranch } from '@/test-utils/mock-reflector-get-all-and-override';
import { CLINIC_TYPES_KEY, FACILITY_TYPES_KEY } from './clinic-type.decorator';
import { ClinicTypeGuard, FacilityTypeGuard } from './clinic-type.guard';

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
      reflector.getAllAndOverride.mockReturnValue(undefined);

      await expect(
        clinicTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).resolves.toBe(true);
      expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
    });

    it('blocks request when user has no clinic', async () => {
      mockGetAllAndOverrideKeyBranch(
        reflector.getAllAndOverride,
        CLINIC_TYPES_KEY,
        [ClinicType.GENERAL],
        undefined,
      );

      await expect(
        clinicTypeGuard.canActivate(createContext({})),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks request when clinic is not found', async () => {
      reflector.getAllAndOverride.mockReturnValue([ClinicType.GENERAL]);
      prisma.clinic.findUnique.mockResolvedValue(null);

      await expect(
        clinicTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks request when clinic type does not match required type', async () => {
      reflector.getAllAndOverride.mockReturnValue([ClinicType.DENTAL]);
      prisma.clinic.findUnique.mockResolvedValue({
        type: ClinicType.GENERAL,
        name: 'Main Clinic',
      });

      await expect(
        clinicTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows request when clinic type matches required type', async () => {
      reflector.getAllAndOverride.mockReturnValue([
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
      reflector.getAllAndOverride.mockReturnValue(undefined);

      await expect(
        facilityTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).resolves.toBe(true);
      expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
    });

    it('blocks request when facility type does not match', async () => {
      mockGetAllAndOverrideKeyBranch(
        reflector.getAllAndOverride,
        FACILITY_TYPES_KEY,
        [FacilityType.HOSPITAL],
        undefined,
      );
      prisma.clinic.findUnique.mockResolvedValue({
        facilityType: FacilityType.CLINIC,
        name: 'Main Clinic',
      });

      await expect(
        facilityTypeGuard.canActivate(createContext({ clinicId: 'clinic-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows request when facility type matches', async () => {
      mockGetAllAndOverrideKeyBranch(
        reflector.getAllAndOverride,
        FACILITY_TYPES_KEY,
        [FacilityType.CLINIC],
        undefined,
      );
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
