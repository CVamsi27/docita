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
} from './dto/clinics.dto';

interface AuthRequest {
  user?: {
    clinicId?: string;
    userId?: string;
    role?: string;
  };
}

@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) { }

  @Post()
  create(@Body() dto: CreateClinicDto) {
    return this.clinicsService.create(dto);
  }

  @Get()
  findAll() {
    return this.clinicsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.clinicsService.delete(id);
  }

  @Get('user/:userId')
  getUserClinics(@Param('userId') userId: string) {
    return this.clinicsService.getUserClinics(userId);
  }

  @Get(':id/stats')
  getClinicStats(@Param('id') id: string) {
    return this.clinicsService.getClinicStats(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':clinicId/doctors')
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
  async getDoctors(@Param('clinicId') clinicId: string) {
    return this.clinicsService.getDoctors(clinicId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':clinicId/receptionists')
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
  constructor(private readonly clinicsService: ClinicsService) { }

  @Get('settings')
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
