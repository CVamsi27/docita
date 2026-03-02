import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Request,
  Query,
} from '@nestjs/common';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import {
  CreatePatientDto,
  ListPatientsQueryDto,
  UpdatePatientDto,
} from '@/domains/patients/application/dto/patients.dto';
import {
  type PatientDomainCreateInput,
  type PatientDomainUpdateInput,
  patientDomainCreateSchema,
  patientDomainUpdateSchema,
} from '@workspace/types';

@ApiTags('patients')
@Controller('patients')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
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
  async findOne(@Param('id') id: string) {
    return this.patientService.getPatient(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient' })
  async update(@Param('id') id: string, @Body() body: UpdatePatientDto) {
    return this.patientService.updatePatient(
      id,
      this.normalizeUpdateBody(body),
    );
  }
}
