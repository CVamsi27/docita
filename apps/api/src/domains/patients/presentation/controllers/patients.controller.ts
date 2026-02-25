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
import { PatientService } from '../../application/services/patient.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '../../../../common/types/common.types';
import { PatientProps } from '../../core/entities/patient.entity';

@ApiTags('patients')
@Controller('patients')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class PatientsController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @ApiOperation({ summary: 'Create new patient' })
  async create(
    @Request() req: RequestWithUser,
    @Body()
    body: Omit<
      PatientProps,
      'id' | 'createdAt' | 'updatedAt' | 'version' | 'clinicId'
    >,
  ) {
    return this.patientService.createPatient({
      ...body,
      clinicId: req.user!.clinicId!,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all patients' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Request() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.patientService.listPatients({
      clinicId: req.user!.clinicId!,
      search,
      gender,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID' })
  async findOne(@Param('id') id: string) {
    return this.patientService.getPatient(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient' })
  async update(@Param('id') id: string, @Body() body: Partial<PatientProps>) {
    return this.patientService.updatePatient(id, body);
  }
}
