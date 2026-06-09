// jscpd:ignore-start
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { Specialization } from '@workspace/db';
import {
  CreateEducationDto,
  // jscpd:ignore-end
  CreateEducationSchema,
  CreateCertificationDto,
  CreateCertificationSchema,
  AddSpecializationDto,
  AddSpecializationSchema,
} from '@/domains/doctors/application/dto/doctors.dto';
import {
  DoctorsApiAccess,
  assertDoctorInClinic,
} from '@/domains/doctors/presentation/controllers/doctors.controller.access';

@Controller('doctors')
@DoctorsApiAccess()
export class DoctorsCredentialsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  private async ensureDoctorAccess(
    id: string,
    req: RequestWithUser,
  ): Promise<void> {
    await assertDoctorInClinic(
      this.doctorsService,
      id,
      req.user?.clinicId || undefined,
    );
  }

  @Get(':id/education')
  async getEducation(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.getEducationHistory(id);
  }

  @Post(':id/education')
  async addEducation(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateEducationSchema)) dto: CreateEducationDto,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.addEducation(id, dto);
  }

  @Put(':id/education/:educationId')
  async updateEducation(
    @Param('id') id: string,
    @Param('educationId') educationId: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateEducationSchema))
    dto: Partial<CreateEducationDto>,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.updateEducation(educationId, dto, id);
  }

  @Delete(':id/education/:educationId')
  async removeEducation(
    @Param('id') id: string,
    @Param('educationId') educationId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.removeEducation(educationId, id);
  }

  @Get(':id/certifications')
  async getCertifications(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.getCertifications(id);
  }

  @Post(':id/certifications')
  async addCertification(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateCertificationSchema))
    dto: CreateCertificationDto,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.addCertification(id, dto);
  }

  @Put(':id/certifications/:certificationId')
  async updateCertification(
    @Param('id') id: string,
    @Param('certificationId') certificationId: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateCertificationSchema))
    dto: Partial<CreateCertificationDto>,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.updateCertification(certificationId, dto, id);
  }

  @Delete(':id/certifications/:certificationId')
  async removeCertification(
    @Param('id') id: string,
    @Param('certificationId') certificationId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.removeCertification(certificationId, id);
  }

  @Get(':id/specializations')
  async getSpecializations(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.getSpecializations(id);
  }

  @Post(':id/specializations')
  async addSpecialization(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(AddSpecializationSchema))
    dto: AddSpecializationDto,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.addSpecialization(
      id,
      dto.specialization,
      dto.yearsOfPractice,
    );
  }

  @Delete(':id/specializations/:specialization')
  async removeSpecialization(
    @Param('id') id: string,
    @Param('specialization') specialization: Specialization,
    @Request() req: RequestWithUser,
  ) {
    await this.ensureDoctorAccess(id, req);
    return this.doctorsService.removeSpecialization(id, specialization);
  }
}
