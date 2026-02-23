import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
  HttpCode,
  Query,
} from '@nestjs/common';
import {
  DPDPComplianceService,
  DataSubjectRight,
} from './dpdp-compliance.service';
import { ConsentType, ConsentStatus, Role } from '@workspace/db';
import { Request } from 'express';

interface AuthUser {
  id: string;
  clinicId: string;
}
import { z } from 'zod';
import { ZodValidationPipe } from 'nestjs-zod';
import { RolesGuard } from '../auth/auth/roles.guard';
import { Roles } from '../auth/auth/roles.decorator';
import { JwtAuthGuard } from '../auth/auth/jwt-auth.guard';
import { DeletePatientDataDto } from './dto/compliance.dto';

const recordConsentSchema = z.object({
  patientId: z.string(),
  clinicId: z.string(),
  consentType: z.nativeEnum(ConsentType),
  status: z.nativeEnum(ConsentStatus).default(ConsentStatus.ACTIVE),
  purpose: z.string(),
  givenBy: z.string().optional(),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
});

const withdrawConsentSchema = z.object({
  reason: z.string(),
  withdrawnBy: z.string(),
});

type RecordConsentDto = z.infer<typeof recordConsentSchema>;
type WithdrawConsentDto = z.infer<typeof withdrawConsentSchema>;

@Controller('consent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsentController {
  constructor(private readonly dpdpService: DPDPComplianceService) {}

  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN)
  @HttpCode(201)
  async recordConsent(
    @Body(new ZodValidationPipe(recordConsentSchema)) data: RecordConsentDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.dpdpService.recordConsent(data, ipAddress);
  }

  @Get('history')
  @Roles(Role.DOCTOR, Role.ADMIN)
  async getConsentHistory(
    @Query('patientId') patientId: string,
    @Query('clinicId') clinicId: string,
  ) {
    return this.dpdpService.getConsentHistory(patientId, clinicId);
  }

  @Post(':consentId/withdraw')
  @Roles(Role.DOCTOR, Role.ADMIN)
  async withdrawConsent(
    @Param('consentId') consentId: string,
    @Body(new ZodValidationPipe(withdrawConsentSchema))
    data: WithdrawConsentDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.dpdpService.withdrawConsent(
      consentId,
      data.reason,
      data.withdrawnBy,
      ipAddress,
    );
  }

  @Post('patients/:patientId/delete')
  @Roles(Role.ADMIN)
  @HttpCode(200)
  async deletePatientData(
    @Param('patientId') patientId: string,
    @Body() dto: DeletePatientDataDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.dpdpService.handleErasureRequest(
      {
        patientId,
        clinicId: (req.user as AuthUser)?.clinicId,
        requestType: DataSubjectRight.ERASURE,
        reason: dto.reason,
        requestedBy: dto.requestedBy,
      },
      ipAddress,
    );
  }
}
