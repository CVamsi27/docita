import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Request,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { ConsentCommandService } from '@/shared/modules/compliance/consent-command.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  APP_ACCESS_TARGETS,
  DPDP_NOTICE_VERSION,
  type PatientDomainCreateInput,
  type PatientDomainUpdateInput,
  patientDomainCreateSchema,
  patientDomainUpdateSchema,
  listPatientsResponseSchema,
  patientResponseSchema,
} from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { RequirePolicy } from '@/shared/modules/auth/decorators/require-policy.decorator';
import { EmergencyAccess } from '@/shared/modules/auth/decorators/emergency-access.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';
import {
  CreatePatientDto,
  ListPatientsQueryDto,
  UpdatePatientDto,
} from '@/domains/patients/application/dto/patients.dto';

@ApiTags('patients')
@Controller('patients')
@UseGuards(TierGuard)
@RequireFeature(Feature.BASIC_PATIENT_MANAGEMENT)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_READ))
export class PatientsController {
  constructor(
    private readonly patientService: PatientService,
    private readonly consentCommand: ConsentCommandService,
    private readonly auditService: AuditService,
  ) {}

  private toPatientResponse(value: unknown) {
    const candidate =
      typeof value === 'object' &&
      value !== null &&
      'toPlain' in value &&
      typeof value.toPlain === 'function'
        ? value.toPlain()
        : value;
    return patientResponseSchema.parse(candidate);
  }

  private normalizeCreateBody(
    body: CreatePatientDto,
    clinicId: string,
  ): PatientDomainCreateInput {
    return patientDomainCreateSchema.parse({
      ...body,
      clinicId,
    });
  }

  private normalizeUpdateBody(
    body: UpdatePatientDto,
  ): PatientDomainUpdateInput {
    return patientDomainUpdateSchema.parse(body);
  }

  @Post()
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS, 'write'))
  @RequiresIdempotency()
  @ApiOperation({ summary: 'Create new patient' })
  async create(
    @Request() req: RequestWithUser,
    @Body() body: CreatePatientDto,
  ) {
    const consent = body.dpdpConsent;
    if (!consent || consent.accepted !== true)
      throw new BadRequestException(
        'DPDP consent is required to add a patient',
      );
    if (consent.noticeVersion !== DPDP_NOTICE_VERSION)
      throw new BadRequestException(
        'The DPDP notice has been updated. Please refresh and re-collect consent before saving.',
      );

    const { clinicId } = getClinicStaffRequestContext(req);
    const created = await this.patientService.createPatient(
      this.normalizeCreateBody(body, clinicId),
    );

    await this.consentCommand.recordDpdpNoticeConsent({
      patientId: created.id,
      clinicId,
      noticeVersion: consent.noticeVersion,
      givenByName: consent.givenByName,
      givenByRelation: consent.relation,
      createdBy: req.user?.id,
      ipAddress: req.ip,
      userAgent:
        typeof req.headers?.['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined,
      notes: 'Collected by staff via Add Patient modal',
    });

    return this.toPatientResponse(created);
  }

  @Get()
  @ApiOperation({ summary: 'List all patients' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Request() req: RequestWithUser,
    @Query() query: ListPatientsQueryDto,
  ) {
    const { search, gender, page, limit } = query;
    await logClinicPhiListRead(
      this.auditService,
      req,
      'VIEW_PATIENT_LIST',
      'Patient',
      { search, gender, page: page ?? 1, limit: limit ?? 20 },
    );
    const result = await this.patientService.listPatients({
      clinicId: getClinicStaffRequestContext(req).clinicId,
      search,
      gender,
      page: page ?? 1,
      limit: limit ?? 20,
    });

    return listPatientsResponseSchema.parse({
      items: result.items.map((patient) => this.toPatientResponse(patient)),
      total: result.total,
    });
  }

  @Get(':id')
  @RequirePolicy('patient', 'read')
  @EmergencyAccess()
  @ApiOperation({ summary: 'Get patient by ID' })
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    const patient = await this.patientService.getPatient(
      id,
      getClinicStaffRequestContext(req).clinicId,
    );
    await logPatientPhiRead(this.auditService, req, id, 'VIEW_PROFILE');
    return this.toPatientResponse(patient);
  }

  @Patch(':id')
  @RequirePolicy('patient', 'update')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_WRITE, 'write'))
  @ApiOperation({ summary: 'Update patient' })
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdatePatientDto,
  ) {
    const updated = await this.patientService.updatePatient(
      id,
      this.normalizeUpdateBody(body),
      getClinicStaffRequestContext(req).clinicId,
    );
    return this.toPatientResponse(updated);
  }

  @Delete(':id')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS, 'write'))
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete patient' })
  async delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    await this.patientService.deletePatient(
      id,
      getClinicStaffRequestContext(req).clinicId,
    );
  }
}
