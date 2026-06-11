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
import { APP_ACCESS_TARGETS, verifyAbhaRequestSchema } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AbhaVerificationService } from '@/domains/patients/application/services/abha-verification.service';
import { VerifyAbhaDto } from '@/domains/patients/application/dto/abha-verification.dto';

@ApiTags('patients')
@Controller('patients/:patientId/abha')
@UseGuards(TierGuard)
@RequireFeature(Feature.ABDM_INTEGRATION)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_WRITE))
export class PatientAbdmController {
  constructor(private readonly abhaVerification: AbhaVerificationService) {}

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
}
