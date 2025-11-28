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

@Controller('doctor-clinics')
export class DoctorClinicsController {
  constructor(private readonly doctorClinicsService: DoctorClinicsService) {}

  @Post()
  assignDoctor(
    @Body() data: { doctorId: string; clinicId: string; role?: string },
  ) {
    return this.doctorClinicsService.assignDoctor(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }

  @Delete()
  removeDoctor(@Body() data: { doctorId: string; clinicId: string }) {
    return this.doctorClinicsService.removeDoctor(data.doctorId, data.clinicId);
  }

  @Get('doctor/:doctorId')
  getDoctorClinics(@Param('doctorId') doctorId: string) {
    return this.doctorClinicsService.getDoctorClinics(doctorId);
  }

  @Get('clinic/:clinicId')
  getClinicDoctors(@Param('clinicId') clinicId: string) {
    return this.doctorClinicsService.getClinicDoctors(clinicId);
  }

  @Put('role')
  updateRole(
    @Body() data: { doctorId: string; clinicId: string; role: string },
  ) {
    return this.doctorClinicsService.updateRole(
      data.doctorId,
      data.clinicId,
      data.role,
    );
  }
}
