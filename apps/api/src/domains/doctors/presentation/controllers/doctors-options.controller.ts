import { Controller, Get } from '@nestjs/common';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { DoctorsApiAccess } from '@/domains/doctors/presentation/controllers/doctors.controller.access';

@Controller('doctors')
@DoctorsApiAccess()
export class DoctorsOptionsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('options/specializations')
  getAvailableSpecializations() {
    return this.doctorsService.getAvailableSpecializations();
  }

  @Get('options/hospital-roles')
  getAvailableHospitalRoles() {
    return this.doctorsService.getAvailableHospitalRoles();
  }
}
