import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConsentCommandService } from './consent-command.service';
import { ConsentQueryService } from './consent-query.service';
import { DataSubjectRequestService } from './data-subject-request.service';
import { DataSubjectRight } from './dpdp-compliance.types';
import { ConsentType, ConsentStatus, Role } from '@workspace/db';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { z } from 'zod';
import { ZodValidationPipe } from 'nestjs-zod';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { DeletePatientDataDto } from './dto/compliance.dto';
import { ConsentPdfService } from './consent-pdf.service';

const recordConsentSchema = z.object({
  patientId: z.string(),
  clinicId: z.string().optional(),
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

function requireClinicId(clinicId: string | null | undefined): string {
  if (!clinicId) throw new BadRequestException('Clinic context is required');
  return clinicId;
}

@Controller('consent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsentController {
  constructor(
    private readonly consentCommand: ConsentCommandService,
    private readonly consentQuery: ConsentQueryService,
    private readonly dataSubjectRequests: DataSubjectRequestService,
    private readonly consentPdfService: ConsentPdfService,
  ) {}

  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @HttpCode(201)
  async recordConsent(
    @Body(new ZodValidationPipe(recordConsentSchema)) data: RecordConsentDto,
    @Req() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.consentCommand.recordConsent(
      {
        ...data,
        clinicId: requireClinicId(data.clinicId ?? req.user?.clinicId),
        actorUserId: req.user?.id,
      },
      ipAddress,
    );
  }

  @Get('history')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  async getConsentHistory(
    @Query('patientId') patientId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.consentQuery.getConsentHistory(
      patientId,
      requireClinicId(req.user?.clinicId),
    );
  }

  @Get('patients/:patientId/consent-pdf')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR, Role.RECEPTIONIST)
  async getConsentPdf(
    @Param('patientId') patientId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const buffer = await this.consentPdfService.generateForPatient(
      patientId,
      requireClinicId(req.user?.clinicId),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="docita-consent-${patientId}.pdf"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Post(':consentId/withdraw')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  async withdrawConsent(
    @Param('consentId') consentId: string,
    @Body(new ZodValidationPipe(withdrawConsentSchema))
    data: WithdrawConsentDto,
    @Req() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.consentCommand.withdrawConsent(
      consentId,
      data.reason,
      data.withdrawnBy,
      ipAddress,
      req.user?.clinicId ?? undefined,
      req.user?.id,
    );
  }

  @Get('patients/:patientId/export')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @HttpCode(200)
  async exportPatientData(
    @Param('patientId') patientId: string,
    @Req() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    // Satisfies the DPDP right to access + data portability: returns a
    // machine-readable copy of the patient's record and is audit-logged.
    return this.dataSubjectRequests.handlePortabilityRequest(
      {
        patientId,
        clinicId: requireClinicId(req.user?.clinicId),
        requestType: DataSubjectRight.PORTABILITY,
        requestedBy: req.user?.id ?? 'unknown',
      },
      ipAddress,
    );
  }

  @Post('patients/:patientId/delete')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @HttpCode(200)
  async deletePatientData(
    @Param('patientId') patientId: string,
    @Body() dto: DeletePatientDataDto,
    @Req() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.dataSubjectRequests.handleErasureRequest(
      {
        patientId,
        clinicId: requireClinicId(req.user?.clinicId),
        requestType: DataSubjectRight.ERASURE,
        reason: dto.reason,
        requestedBy: dto.requestedBy,
      },
      ipAddress,
    );
  }
}
