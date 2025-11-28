import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { patientSchema } from '@workspace/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface CreatePatientDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string | Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phoneNumber: string;
  email?: string;
  address?: string;
  medicalHistory?: string[];
  bloodGroup?: string;
  allergies?: string;
  clinicId?: string;
}
type UpdatePatientDto = Partial<CreatePatientDto>;

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
  findAll(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.patientsService.findAll(req.user.clinicId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Post()
  @UsePipes(
    new ZodValidationPipe(
      patientSchema.omit({ id: true, createdAt: true, updatedAt: true }),
    ),
  )
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
  @UsePipes(
    new ZodValidationPipe(
      patientSchema
        .partial()
        .omit({ id: true, createdAt: true, updatedAt: true }),
    ),
  )
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

  @Get(':id/documents')
  getPatientDocuments(@Param('id') id: string) {
    return this.patientsService.getDocuments(id);
  }
}
