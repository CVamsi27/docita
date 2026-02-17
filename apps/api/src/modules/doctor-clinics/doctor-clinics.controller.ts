import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { DoctorClinicsService } from './doctor-clinics.service';
import {
  AssignDoctorDto,
  RemoveDoctorDto,
  UpdateRoleDto,
  DoctorClinicResponseDto,
  DoctorClinicListResponseDto,
} from './dto/doctor-clinics.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { Request } from '@nestjs/common';

interface AuthRequest {
  user: { userId: string; clinicId: string; role: Role };
}

@Controller('doctor-clinics')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
export class DoctorClinicsController {
  constructor(private readonly doctorClinicsService: DoctorClinicsService) {}

  private verifyClinicAccess(req: AuthRequest, clinicId: string): void {
    if (req.user.role !== Role.SUPER_ADMIN && req.user.clinicId !== clinicId) {
      throw new ForbiddenException(
        'Cannot manage doctor-clinic assignments for another clinic',
      );
    }
  }

  @Post()
  @ZodSerializerDto(DoctorClinicResponseDto)
  assignDoctor(@Body() data: AssignDoctorDto, @Req() req: AuthRequest) {
    this.verifyClinicAccess(req, data.clinicId);
    return this.doctorClinicsService.assignDoctor(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }

  @Delete()
  @ZodSerializerDto(DoctorClinicResponseDto)
  removeDoctor(@Body() data: RemoveDoctorDto, @Req() req: AuthRequest) {
    this.verifyClinicAccess(req, data.clinicId);
    return this.doctorClinicsService.removeDoctor(data.doctorId, data.clinicId);
  }

  @Get('doctor/:doctorId')
  @ZodSerializerDto(DoctorClinicListResponseDto)
  getDoctorClinics(@Param('doctorId') doctorId: string) {
    return this.doctorClinicsService.getDoctorClinics(doctorId);
  }

  @Get('clinic/:clinicId')
  @ZodSerializerDto(DoctorClinicListResponseDto)
  getClinicDoctors(
    @Param('clinicId') clinicId: string,
    @Req() req: AuthRequest,
  ) {
    this.verifyClinicAccess(req, clinicId);
    return this.doctorClinicsService.getClinicDoctors(clinicId);
  }

  @Put('role')
  @ZodSerializerDto(DoctorClinicResponseDto)
  updateRole(@Body() data: UpdateRoleDto, @Req() req: AuthRequest) {
    this.verifyClinicAccess(req, data.clinicId);
    return this.doctorClinicsService.updateRole(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }
}
