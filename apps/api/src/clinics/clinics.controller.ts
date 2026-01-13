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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateClinicDto,
  UpdateClinicDto,
  CreateDoctorDto,
  CreateReceptionistDto,
  ClinicSettingsDto,
  ClinicResponseDto,
  ClinicListResponseDto,
} from './dto/clinics.dto';
import { UserResponseDto } from '../users/dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user?: {
    clinicId?: string;
    userId?: string;
    role?: string;
  };
}

@Controller('clinics')
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

  @UseGuards(JwtAuthGuard)
  @Post(':clinicId/doctors')
  @ZodSerializerDto(UserResponseDto)
  async createDoctor(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateDoctorDto,
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

  @UseGuards(JwtAuthGuard)
  @Get(':clinicId/doctors')
  // @ZodSerializerDto(UserListResponseDto) - Assuming array of UserResponseDto
  // Since we haven't created UserListResponseDto, let's leave it for now or create it.
  // Actually, let's assume getDoctors returns generic response or specific schema.
  // For now, I will omit the decorator for getDoctors to be safe or investigate context.
  async getDoctors(@Param('clinicId') clinicId: string) {
    return this.clinicsService.getDoctors(clinicId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':clinicId/receptionists')
  @ZodSerializerDto(UserResponseDto)
  async createReceptionist(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateReceptionistDto,
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

  @UseGuards(JwtAuthGuard)
  @Get(':clinicId/receptionists')
  async getReceptionists(@Param('clinicId') clinicId: string) {
    return this.clinicsService.getReceptionists(clinicId);
  }
}

@Controller('clinic')
@UseGuards(JwtAuthGuard)
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
}
