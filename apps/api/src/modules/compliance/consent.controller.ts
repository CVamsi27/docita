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
import { DPDPComplianceService } from './dpdp-compliance.service';
import { ConsentType, ConsentStatus } from '@workspace/db';
import { Request } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from 'nestjs-zod';

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
export class ConsentController {
  constructor(private readonly dpdpService: DPDPComplianceService) {}

  @Post()
  @HttpCode(201)
  async recordConsent(
    @Body(new ZodValidationPipe(recordConsentSchema)) data: RecordConsentDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.dpdpService.recordConsent(data, ipAddress);
  }

  @Get('history')
  async getConsentHistory(
    @Query('patientId') patientId: string,
    @Query('clinicId') clinicId: string,
  ) {
    return this.dpdpService.getConsentHistory(patientId, clinicId);
  }

  @Post(':consentId/withdraw')
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
  @HttpCode(200)
  // TODO: Add Role Guard for ADMIN only
  async deletePatientData(
    @Param('patientId') patientId: string,
    @Body() body: { reason: string; requestedBy: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.dpdpService.handleErasureRequest(
      {
        patientId,
        clinicId: req.user?.['clinicId'], // Assuming extracted from token
        requestType: 'ERASURE' as any,
        reason: body.reason,
        requestedBy: body.requestedBy,
      },
      ipAddress,
    );
  }
}
