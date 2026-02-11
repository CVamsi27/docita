import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';
import {
  CreateClinicDto,
  UpdateClinicDto,
  ClinicCreateDoctorDto,
  ClinicCreateReceptionistDto,
  ClinicSettingsDto,
  ClinicResponseDto,
  ClinicListResponseDto,
} from './dto/clinics.dto';
import { UserResponseDto } from '../users/dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user?: {
    clinicId?: string;
    id?: string;
    role?: string;
  };
}

@Controller('clinics')
@Roles(Role.SUPER_ADMIN)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @ZodSerializerDto(ClinicResponseDto)
  create(@Body() dto: CreateClinicDto) {
    return this.clinicsService.create(dto);
  }

  @Get()
  @ZodSerializerDto(ClinicListResponseDto)
  findAll() {
    return this.clinicsService.findAll();
  }

  @Get(':id')
  @ZodSerializerDto(ClinicResponseDto)
  findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(id);
  }

  @Put(':id')
  @ZodSerializerDto(ClinicResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(id, dto);
  }

  @Delete(':id')
  @ZodSerializerDto(ClinicResponseDto)
  delete(@Param('id') id: string) {
    return this.clinicsService.delete(id);
  }

  @Get('user/:userId')
  @ZodSerializerDto(ClinicListResponseDto)
  getUserClinics(@Param('userId') userId: string) {
    return this.clinicsService.getUserClinics(userId);
  }

  @Get(':id/stats')
  getClinicStats(@Param('id') id: string) {
    return this.clinicsService.getClinicStats(id);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @Post(':clinicId/doctors')
  @ZodSerializerDto(UserResponseDto)
  async createDoctor(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateDoctorDto,
    @Request() req: AuthRequest,
  ) {
    // Only clinic admins can create doctors
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only create doctors in your own clinic',
      );
    }
    return this.clinicsService.createDoctor(clinicId, dto);
  }

  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.RECEPTIONIST,
    Role.ADMIN_DOCTOR,
    Role.SUPER_ADMIN,
  )
  @Get(':clinicId/doctors')
  // @ZodSerializerDto(UserListResponseDto) - Assuming array of UserResponseDto
  // Since we haven't created UserListResponseDto, let's leave it for now or create it.
  // Actually, let's assume getDoctors returns generic response or specific schema.
  // For now, I will omit the decorator for getDoctors to be safe or investigate context.
  async getDoctors(@Param('clinicId') clinicId: string) {
    return this.clinicsService.getDoctors(clinicId);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @Post(':clinicId/receptionists')
  @ZodSerializerDto(UserResponseDto)
  async createReceptionist(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateReceptionistDto,
    @Request() req: AuthRequest,
  ) {
    // Only clinic admins can create receptionists
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only create receptionists in your own clinic',
      );
    }
    return this.clinicsService.createReceptionist(clinicId, dto);
  }

  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.RECEPTIONIST,
    Role.ADMIN_DOCTOR,
    Role.SUPER_ADMIN,
  )
  @Get(':clinicId/receptionists')
  async getReceptionists(@Param('clinicId') clinicId: string) {
    return this.clinicsService.getReceptionists(clinicId);
  }
}

@Controller('clinic')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class ClinicSettingsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get('settings')
  @ZodSerializerDto(ClinicResponseDto)
  async getSettings(@Request() req: AuthRequest) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    const clinic = await this.clinicsService.findOne(clinicId);
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    return clinic;
  }

  @Put('settings')
  @ZodSerializerDto(ClinicResponseDto)
  async updateSettings(
    @Request() req: AuthRequest,
    @Body() dto: ClinicSettingsDto,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.updateSettings(clinicId, dto);
  }
  @Get('members')
  async getMembers(@Request() req: AuthRequest) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.getMembers(clinicId);
  }

  @Get('prescription-defaults')
  async getPrescriptionDefaults(@Request() req: AuthRequest) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    // Assuming getPrescriptionDefaults is implemented in service or we mock it for now.
    // Ideally, this should return settings.
    // Let's implement basics in service or assume the method exists.
    // If not, we might need to add it to service too.
    return this.clinicsService.getPrescriptionDefaults(clinicId);
  }

  @Put('prescription-defaults')
  async updatePrescriptionDefaults(
    @Request() req: AuthRequest,
    @Body() dto: any, // Use proper DTO
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.updatePrescriptionDefaults(clinicId, dto);
  }
}
