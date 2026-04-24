import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import {
  admitPatientRequestSchema,
  dischargePatientRequestSchema,
  transferPatientRequestSchema,
  type AdmitPatientRequest,
  type DischargePatientRequest,
  type TransferPatientRequest,
} from '@workspace/types';
import { RequestWithUser } from '@/common/types/common.types';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { IpdService } from '@/domains/ipd/application/services/ipd.service';

@ApiTags('IPD')
@Controller('ipd')
@UseGuards(TierGuard)
@RequireFeature(Feature.FULL_EHR)
@Roles(
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
)
export class IpdController {
  constructor(private readonly ipdService: IpdService) {}

  @Get('wards')
  @ApiOperation({ summary: 'List wards, rooms, and beds for the facility' })
  listWards(@Request() req: RequestWithUser, @Query('search') search?: string) {
    return this.ipdService.listWards(this.getClinicId(req), search);
  }

  @Get('admissions')
  @ApiOperation({ summary: 'List inpatient admissions for the facility' })
  listAdmissions(
    @Request() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    return this.ipdService.listAdmissions(this.getClinicId(req), status);
  }

  @Post('admissions')
  @UsePipes(new ZodValidationPipe(admitPatientRequestSchema))
  @ApiOperation({ summary: 'Admit a patient to an available bed' })
  admitPatient(
    @Request() req: RequestWithUser,
    @Body() body: AdmitPatientRequest,
  ) {
    return this.ipdService.admitPatient(
      this.getClinicId(req),
      body,
      this.getUserId(req),
      this.getIpAddress(req),
    );
  }

  @Post('transfers')
  @UsePipes(new ZodValidationPipe(transferPatientRequestSchema))
  @ApiOperation({ summary: 'Transfer an active admission to another bed' })
  transferPatient(
    @Request() req: RequestWithUser,
    @Body() body: TransferPatientRequest,
  ) {
    return this.ipdService.transferPatient(
      this.getClinicId(req),
      body,
      this.getUserId(req),
      this.getIpAddress(req),
    );
  }

  @Post('discharges')
  @UsePipes(new ZodValidationPipe(dischargePatientRequestSchema))
  @ApiOperation({ summary: 'Discharge an active inpatient admission' })
  dischargePatient(
    @Request() req: RequestWithUser,
    @Body() body: DischargePatientRequest,
  ) {
    return this.ipdService.dischargePatient(
      this.getClinicId(req),
      body,
      this.getUserId(req),
      this.getIpAddress(req),
    );
  }

  private getClinicId(req: RequestWithUser): string {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }

    return req.user.clinicId;
  }

  private getUserId(req: RequestWithUser): string {
    if (!req.user?.id) {
      throw new ForbiddenException('Authenticated user is required');
    }

    return req.user.id;
  }

  private getIpAddress(req: RequestWithUser): string | undefined {
    return req.ip || req.socket?.remoteAddress;
  }
}
