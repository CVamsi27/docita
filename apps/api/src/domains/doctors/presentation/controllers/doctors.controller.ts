import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Role } from '@workspace/db';

import {
  CreateDoctorDto,
  UpdateDoctorDto,
  DoctorResponseDto,
  DoctorListResponseDto,
  CreateDoctorSchema,
  UpdateDoctorSchema,
  UpdateDoctorRegistrationDto,
  UpdateDoctorRegistrationSchema,
  CreateEducationDto,
  CreateEducationSchema,
  CreateCertificationDto,
  CreateCertificationSchema,
  AddSpecializationDto,
  AddSpecializationSchema,
} from '@/domains/doctors/application/dto/doctors.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/common/types/common.types';
import { Specialization } from '@workspace/db';

@Controller('doctors')
@UseGuards(TierGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ZodSerializerDto(DoctorListResponseDto)
  async findAll(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    return this.doctorsService.findAll(req.user.clinicId);
  }

  @Get('options/specializations')
  getAvailableSpecializations() {
    return this.doctorsService.getAvailableSpecializations();
  }

  @Get('options/hospital-roles')
  getAvailableHospitalRoles() {
    return this.doctorsService.getAvailableHospitalRoles();
  }

  @Get(':id')
  @ZodSerializerDto(DoctorResponseDto)
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.doctorsService.findOne(id, req.user?.clinicId || undefined);
  }

  @Post()
  @RequireFeature(Feature.ROLE_MANAGEMENT)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  async create(
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateDoctorSchema)) dto: CreateDoctorDto,
  ) {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    return this.doctorsService.create(req.user.clinicId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDoctorSchema)) dto: UpdateDoctorDto,
  ) {
    if (req.user?.role === Role.DOCTOR && req.user.id !== id) {
      throw new ForbiddenException('Doctors can only update their own profile');
    }
    return this.doctorsService.update(id, dto, req.user?.clinicId || undefined);
  }

  @Put(':id/registration-number')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  async updateRegistrationNumber(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDoctorRegistrationSchema))
    dto: UpdateDoctorRegistrationDto,
  ) {
    if (req.user?.role === Role.DOCTOR && req.user.id !== id) {
      throw new ForbiddenException('Doctors can only update their own profile');
    }
    return this.doctorsService.update(
      id,
      { registrationNumber: dto.registrationNumber },
      req.user?.clinicId || undefined,
    );
  }

  @Delete(':id')
  @RequireFeature(Feature.ROLE_MANAGEMENT)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.doctorsService.remove(id, req.user?.clinicId || undefined);
  }

  @Post(':id/signature-upload-session')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async createSignatureUploadSession(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.doctorsService.createSignatureUploadSession(
      id,
      req.user?.clinicId || undefined,
    );
  }

  @Post(':id/reverify-registration')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async reverifyRegistration(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.doctorsService.reverifyDoctor(
      id,
      req.user?.clinicId || undefined,
    );
  }

  @Get(':id/education')
  async getEducation(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.getEducationHistory(id);
  }

  @Post(':id/education')
  async addEducation(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateEducationSchema)) dto: CreateEducationDto,
  ) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
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
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.updateEducation(educationId, dto, id);
  }

  @Delete(':id/education/:educationId')
  async removeEducation(
    @Param('id') id: string,
    @Param('educationId') educationId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.removeEducation(educationId, id);
  }

  @Get(':id/certifications')
  async getCertifications(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.getCertifications(id);
  }

  @Post(':id/certifications')
  async addCertification(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateCertificationSchema))
    dto: CreateCertificationDto,
  ) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
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
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.updateCertification(certificationId, dto, id);
  }

  @Delete(':id/certifications/:certificationId')
  async removeCertification(
    @Param('id') id: string,
    @Param('certificationId') certificationId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.removeCertification(certificationId, id);
  }

  @Get(':id/specializations')
  async getSpecializations(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.getSpecializations(id);
  }

  @Post(':id/specializations')
  async addSpecialization(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(AddSpecializationSchema))
    dto: AddSpecializationDto,
  ) {
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
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
    await this.doctorsService.findOne(id, req.user?.clinicId || undefined);
    return this.doctorsService.removeSpecialization(id, specialization);
  }
}
