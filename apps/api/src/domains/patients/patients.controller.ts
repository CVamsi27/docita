import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EmergencyAccess } from '../../shared/modules/auth/decorators/emergency-access.decorator';
import { PatientsService } from './patients.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientResponseDto,
  PaginatedPatientResponseDto,
  CreatePatientSchema,
  UpdatePatientSchema,
} from './dto/patients.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@ApiTags('patients')
@Controller('patients')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({ summary: 'List all patients' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ZodSerializerDto(PaginatedPatientResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
  ) {
    return this.patientsService.findAll(req.user.clinicId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
      search,
    });
  }

  @Get(':id')
  @EmergencyAccess()
  @ZodSerializerDto(PatientResponseDto)
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.patientsService.findOne(id, req.user.clinicId);
  }

  @Post()
  @ZodSerializerDto(PatientResponseDto)
  @UsePipes(new ZodValidationPipe(CreatePatientSchema))
  create(
    @Request() req: AuthRequest,
    @Body() createPatientDto: CreatePatientDto,
  ) {
    // Always use authenticated user's clinicId — never trust client-supplied value
    return this.patientsService.create({
      ...createPatientDto,
      clinicId: req.user.clinicId,
    });
  }

  @Patch(':id')
  @ZodSerializerDto(PatientResponseDto)
  @UsePipes(new ZodValidationPipe(UpdatePatientSchema))
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, updatePatientDto, {
      clinicId: req.user.clinicId,
    });
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.patientsService.remove(id, {
      clinicId: req.user.clinicId,
    });
  }

  @Get(':id/appointments')
  getPatientAppointments(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.patientsService.getAppointments(id, req.user.clinicId);
  }

  @Get(':id/statistics')
  getPatientStatistics(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.patientsService.getStatistics(id, req.user.clinicId);
  }

  @Get(':id/documents')
  getPatientDocuments(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.patientsService.getDocuments(id, req.user.clinicId);
  }

  @Get(':id/tags')
  getPatientTags(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.patientsService.getTags(id, req.user.clinicId);
  }

  @Get(':id/medical-history-timeline')
  getMedicalHistoryTimeline(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.patientsService.getMedicalHistoryTimeline(
      id,
      req.user.clinicId,
    );
  }
}
