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
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientResponseDto,
  PaginatedPatientResponseDto,
} from './dto/patients.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
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
  @ZodSerializerDto(PatientResponseDto)
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Post()
  @ZodSerializerDto(PatientResponseDto)
  create(
    @Request() req: AuthRequest,
    @Body() createPatientDto: CreatePatientDto,
  ) {
    return this.patientsService.create({
      ...createPatientDto,
      clinicId: createPatientDto.clinicId || req.user.clinicId,
    });
  }

  @Patch(':id')
  @ZodSerializerDto(PatientResponseDto)
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }

  @Get(':id/appointments')
  getPatientAppointments(@Param('id') id: string) {
    return this.patientsService.getAppointments(id);
  }

  @Get(':id/statistics')
  getPatientStatistics(@Param('id') id: string) {
    return this.patientsService.getStatistics(id);
  }

  @Get(':id/documents')
  getPatientDocuments(@Param('id') id: string) {
    return this.patientsService.getDocuments(id);
  }

  @Get(':id/tags')
  getPatientTags(@Param('id') id: string) {
    return this.patientsService.getTags(id);
  }

  @Get(':id/medical-history-timeline')
  getMedicalHistoryTimeline(@Param('id') id: string) {
    return this.patientsService.getMedicalHistoryTimeline(id);
  }
}
