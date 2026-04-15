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
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS))
export class PatientsController {
  constructor(private readonly patientService: PatientService) {}

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
  @ApiOperation({ summary: 'Create new patient' })
  async create(
    @Request() req: RequestWithUser,
    @Body() body: CreatePatientDto,
  ) {
    return this.patientService.createPatient(
      this.normalizeCreateBody(body, req.user!.clinicId!),
    );
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
    return this.patientService.listPatients({
      clinicId: req.user!.clinicId!,
      search,
      gender,
      page: page ?? 1,
      limit: limit ?? 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID' })
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.patientService.getPatient(id, req.user!.clinicId!);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient' })
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdatePatientDto,
  ) {
    return this.patientService.updatePatient(
      id,
      this.normalizeUpdateBody(body),
      req.user!.clinicId!,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete patient' })
  async delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    await this.patientService.deletePatient(id, req.user!.clinicId!);
  }
}
