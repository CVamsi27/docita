import {
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
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  APP_ACCESS_TARGETS,
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
import { RequestWithUser } from '@/common/types/common.types';
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
  constructor(private readonly patientService: PatientService) {}

  private toPatientResponse(value: unknown) {
    const candidate =
      typeof value === 'object' && value && 'toPlain' in value
        ? (value as { toPlain: () => unknown }).toPlain()
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
  @ApiOperation({ summary: 'Create new patient' })
  async create(
    @Request() req: RequestWithUser,
    @Body() body: CreatePatientDto,
  ) {
    const created = await this.patientService.createPatient(
      this.normalizeCreateBody(body, req.user!.clinicId!),
    );
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
    const result = await this.patientService.listPatients({
      clinicId: req.user!.clinicId!,
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
  @ApiOperation({ summary: 'Get patient by ID' })
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    const patient = await this.patientService.getPatient(
      id,
      req.user!.clinicId!,
    );
    return this.toPatientResponse(patient);
  }

  @Patch(':id')
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
      req.user!.clinicId!,
    );
    return this.toPatientResponse(updated);
  }

  @Delete(':id')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS, 'write'))
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete patient' })
  async delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    await this.patientService.deletePatient(id, req.user!.clinicId!);
  }
}
