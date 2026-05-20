import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import {
  APP_ACCESS_TARGETS,
  createPatientTagRequestSchema,
  updatePatientTagRequestSchema,
} from '@workspace/types';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import { PatientTagsService } from '@/domains/patients/application/services/patient-tags.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logPatientPhiRead } from '@/shared/modules/audit/audit/patient-access-audit.util';
import {
  PatientTagListResponseDto,
  PatientTagResponseDto,
} from '@/domains/patients/application/dto/patient-tags.dto';

@ApiTags('patients')
@Controller('patients/:patientId/tags')
@UseGuards(TierGuard)
@RequireFeature(Feature.BASIC_PATIENT_MANAGEMENT)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS))
export class PatientTagsController {
  constructor(
    private readonly tagsService: PatientTagsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List tags for a patient' })
  @ZodSerializerDto(PatientTagListResponseDto)
  async list(
    @Request() req: RequestWithUser,
    @Param('patientId') patientId: string,
  ) {
    await logPatientPhiRead(this.auditService, req, patientId, 'VIEW_PROFILE');
    return this.tagsService.list({
      clinicId: requireClinicIdFromRequest(req),
      patientId,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Add a tag to a patient' })
  @ZodSerializerDto(PatientTagResponseDto)
  async create(
    @Request() req: RequestWithUser,
    @Param('patientId') patientId: string,
    @Body() body: unknown,
  ) {
    const parsed = createPatientTagRequestSchema.parse(body);
    return this.tagsService.create({
      clinicId: requireClinicIdFromRequest(req),
      patientId,
      ...parsed,
    });
  }

  @Patch(':tagId')
  @ApiOperation({ summary: 'Update a patient tag' })
  @ZodSerializerDto(PatientTagResponseDto)
  async update(
    @Request() req: RequestWithUser,
    @Param('patientId') patientId: string,
    @Param('tagId') tagId: string,
    @Body() body: unknown,
  ) {
    const parsed = updatePatientTagRequestSchema.parse(body);
    return this.tagsService.update({
      clinicId: requireClinicIdFromRequest(req),
      patientId,
      tagId,
      ...parsed,
    });
  }

  @Delete(':tagId')
  @ApiOperation({ summary: 'Remove a tag from a patient' })
  async remove(
    @Request() req: RequestWithUser,
    @Param('patientId') patientId: string,
    @Param('tagId') tagId: string,
  ) {
    await this.tagsService.remove({
      clinicId: requireClinicIdFromRequest(req),
      patientId,
      tagId,
    });
    return { ok: true };
  }
}
