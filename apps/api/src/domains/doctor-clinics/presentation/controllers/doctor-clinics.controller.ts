import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { DoctorClinicsService } from '@/domains/doctor-clinics/application/services/doctor-clinics.service';
import {
  AssignDoctorDto,
  RemoveDoctorDto,
  UpdateRoleDto,
  DoctorClinicResponseDto,
  DoctorClinicListResponseDto,
} from '@/domains/doctor-clinics/application/dto/doctor-clinics.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';

@Controller('doctor-clinics')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
export class DoctorClinicsController {
  constructor(private readonly doctorClinicsService: DoctorClinicsService) {}

  private verifyClinicAccess(req: RequestWithUser, clinicId: string): void {
    const { clinicId: actorClinicId } = getClinicStaffRequestContext(req);
    if (actorClinicId !== clinicId) {
      throw new ForbiddenException(
        'Cannot manage doctor-clinic assignments for another clinic',
      );
    }
  }

  @Post()
  @ZodSerializerDto(DoctorClinicResponseDto)
  assignDoctor(@Body() data: AssignDoctorDto, @Request() req: RequestWithUser) {
    this.verifyClinicAccess(req, data.clinicId);
    return this.doctorClinicsService.assignDoctor(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }

  @Delete()
  @ZodSerializerDto(DoctorClinicResponseDto)
  removeDoctor(@Body() data: RemoveDoctorDto, @Request() req: RequestWithUser) {
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
    @Request() req: RequestWithUser,
  ) {
    this.verifyClinicAccess(req, clinicId);
    return this.doctorClinicsService.getClinicDoctors(clinicId);
  }

  @Put('role')
  @ZodSerializerDto(DoctorClinicResponseDto)
  updateRole(@Body() data: UpdateRoleDto, @Request() req: RequestWithUser) {
    this.verifyClinicAccess(req, data.clinicId);
    return this.doctorClinicsService.updateRole(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }
}
