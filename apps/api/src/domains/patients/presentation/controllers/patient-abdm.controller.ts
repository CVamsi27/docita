import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  APP_ACCESS_TARGETS,
  abhaRequestOtpRequestSchema,
  abhaVerifyOtpRequestSchema,
  verifyAbhaRequestSchema,
} from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AbhaVerificationCommandService } from '@/domains/patients/application/services/abha-verification-command.service';
import { AbhaMobileVerificationService } from '@/domains/patients/application/services/abha-mobile-verification.service';
import {
  AbhaRequestOtpDto,
  AbhaVerifyOtpDto,
  VerifyAbhaDto,
} from '@/domains/patients/application/dto/abha-verification.dto';

@ApiTags('patients')
@Controller('patients/:patientId/abha')
@UseGuards(TierGuard)
@RequireFeature(Feature.ABDM_INTEGRATION)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_WRITE))
export class PatientAbdmController {
  constructor(
    private readonly abhaVerification: AbhaVerificationCommandService,
    private readonly abhaMobile: AbhaMobileVerificationService,
  ) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify a patient ABHA against the ABDM gateway' })
  @UsePipes(new ZodValidationPipe(verifyAbhaRequestSchema))
  async verify(
    @Request() req: RequestWithUser,
    @Param('patientId') patientId: string,
    @Body() dto: VerifyAbhaDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.abhaVerification.verifyForPatient(
      patientId,
      clinicId,
      dto,
      userId,
    );
  }

  @Post('request-otp')
  @ApiOperation({ summary: 'Request an OTP for ABHA verification (M1)' })
  @UsePipes(new ZodValidationPipe(abhaRequestOtpRequestSchema))
  async requestOtp(
    @Request() req: RequestWithUser,
    @Param('patientId') patientId: string,
    @Body() dto: AbhaRequestOtpDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.abhaMobile.requestOtp(patientId, clinicId, dto.mobile);
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify the ABHA OTP and persist the identity (M1)',
  })
  @UsePipes(new ZodValidationPipe(abhaVerifyOtpRequestSchema))
  async verifyOtp(
    @Request() req: RequestWithUser,
    @Param('patientId') patientId: string,
    @Body() dto: AbhaVerifyOtpDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.abhaMobile.verifyOtp(
      patientId,
      clinicId,
      dto.txnId,
      dto.otp,
      userId,
    );
  }
}
