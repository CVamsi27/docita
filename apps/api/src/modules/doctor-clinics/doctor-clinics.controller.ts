import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
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

@Controller('doctor-clinics')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
export class DoctorClinicsController {
  constructor(private readonly doctorClinicsService: DoctorClinicsService) {}

  @Post()
  @ZodSerializerDto(DoctorClinicResponseDto)
  assignDoctor(@Body() data: AssignDoctorDto) {
    return this.doctorClinicsService.assignDoctor(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }

  @Delete()
  @ZodSerializerDto(DoctorClinicResponseDto)
  removeDoctor(@Body() data: RemoveDoctorDto) {
    return this.doctorClinicsService.removeDoctor(data.doctorId, data.clinicId);
  }

  @Get('doctor/:doctorId')
  @ZodSerializerDto(DoctorClinicListResponseDto)
  getDoctorClinics(@Param('doctorId') doctorId: string) {
    return this.doctorClinicsService.getDoctorClinics(doctorId);
  }

  @Get('clinic/:clinicId')
  @ZodSerializerDto(DoctorClinicListResponseDto)
  getClinicDoctors(@Param('clinicId') clinicId: string) {
    return this.doctorClinicsService.getClinicDoctors(clinicId);
  }

  @Put('role')
  @ZodSerializerDto(DoctorClinicResponseDto)
  updateRole(@Body() data: UpdateRoleDto) {
    return this.doctorClinicsService.updateRole(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }
}
