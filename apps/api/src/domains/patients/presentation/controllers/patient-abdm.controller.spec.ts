import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '@workspace/db';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { AbhaVerificationCommandService } from '@/domains/patients/application/services/abha-verification-command.service';
import { AbhaMobileVerificationCommandService } from '@/domains/patients/application/services/abha-mobile-verification-command.service';
import { PatientAbdmController } from './patient-abdm.controller';

describe('PatientAbdmController', () => {
  let controller: PatientAbdmController;

  const verifyForPatient =
    jest.fn<AbhaVerificationCommandService['verifyForPatient']>();
  const mobileVerification = {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  const buildRequest = (): RequestWithUser => {
    const request = Object.create({}) as RequestWithUser;
    request.user = {
      id: 'user-1',
      clinicId: 'clinic-1',
      role: Role.DOCTOR,
    } as RequestWithUser['user'];
    return request;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientAbdmController],
      providers: [
        {
          provide: AbhaVerificationCommandService,
          useValue: { verifyForPatient },
        },
        {
          provide: AbhaMobileVerificationCommandService,
          useValue: mobileVerification,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(TierGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PatientAbdmController>(PatientAbdmController);
    jest.clearAllMocks();
  });

  it('uses the clinic request context when verifying ABHA', async () => {
    verifyForPatient.mockResolvedValue({
      verified: true,
      abhaAddress: 'asha.verma@abdm',
      abhaNumber: '12345678901234',
      kycName: 'Asha Verma',
      verifiedAt: '2026-06-11T00:00:00.000Z',
      error: null,
    });

    const result = await controller.verify(buildRequest(), 'patient-1', {
      abhaAddress: 'asha.verma@abdm',
    });

    expect(result.verified).toBe(true);
    expect(verifyForPatient).toHaveBeenCalledWith(
      'patient-1',
      'clinic-1',
      { abhaAddress: 'asha.verma@abdm' },
      'user-1',
    );
  });

  it('allows staff roles that can write patients', () => {
    const metadata = Reflect.getMetadata(
      'roles',
      PatientAbdmController,
    ) as Role[];

    expect(metadata).toContain(Role.DOCTOR);
    expect(metadata).toContain(Role.RECEPTIONIST);
    expect(metadata).not.toContain(Role.PATIENT);
  });
});
