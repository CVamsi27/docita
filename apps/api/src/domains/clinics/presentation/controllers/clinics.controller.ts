import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  ForbiddenException,
  NotFoundException,
  UsePipes,
} from '@nestjs/common';
import { ClinicsService } from '../../application/services/clinics.service';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import {
  CreateClinicDto,
  UpdateClinicDto,
  ClinicCreateDoctorDto,
  ClinicCreateReceptionistDto,
  ClinicSettingsDto,
  ClinicResponseDto,
  ClinicListResponseDto,
  CreateClinicSchema,
} from '../../application/dto/clinics.dto';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { UserResponseDto } from '../../../users/application/dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { RequestWithUser } from '../../../../common/types/common.types';

@Controller('clinics')
@Roles(Role.SUPER_ADMIN)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @ZodSerializerDto(ClinicResponseDto)
  @UsePipes(new ZodValidationPipe(CreateClinicSchema))
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
    @Request() req: RequestWithUser,
  ) {
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
  async getDoctors(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only view doctors in your own clinic',
      );
    }
    return this.clinicsService.getDoctors(clinicId);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @Post(':clinicId/receptionists')
  @ZodSerializerDto(UserResponseDto)
  async createReceptionist(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateReceptionistDto,
    @Request() req: RequestWithUser,
  ) {
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
  async getReceptionists(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only view receptionists in your own clinic',
      );
    }
    return this.clinicsService.getReceptionists(clinicId);
  }
}

@Controller('clinic')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class ClinicSettingsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get('settings')
  @ZodSerializerDto(ClinicResponseDto)
  async getSettings(@Request() req: RequestWithUser) {
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
    @Request() req: RequestWithUser,
    @Body() dto: ClinicSettingsDto,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.updateSettings(clinicId, dto);
  }
  @Get('members')
  async getMembers(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.getMembers(clinicId);
  }

  @Get('prescription-defaults')
  async getPrescriptionDefaults(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.getPrescriptionDefaults(clinicId);
  }

  @Put('prescription-defaults')
  async updatePrescriptionDefaults(
    @Request() req: RequestWithUser,
    @Body() dto: Record<string, unknown>,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.updatePrescriptionDefaults(clinicId, dto);
  }
}
