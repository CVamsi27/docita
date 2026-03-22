import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UsePipes,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';

import {
  CreateDoctorDto,
  UpdateDoctorDto,
  DoctorResponseDto,
  DoctorListResponseDto,
  CreateDoctorSchema,
  UpdateDoctorSchema,
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
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  @UsePipes(new ZodValidationPipe(CreateDoctorSchema))
  async create(@Request() req: RequestWithUser, @Body() dto: CreateDoctorDto) {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    return this.doctorsService.create(req.user.clinicId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateDoctorSchema))
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ) {
    if (req.user?.role === Role.DOCTOR && req.user.id !== id) {
      throw new ForbiddenException('Doctors can only update their own profile');
    }
    return this.doctorsService.update(id, dto, req.user?.clinicId || undefined);
  }

  @Delete(':id')
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

  async getEducation(@Param('id') id: string) {
    return this.doctorsService.getEducationHistory(id);
  }

  @Post(':id/education')
  @UsePipes(new ZodValidationPipe(CreateEducationSchema))
  async addEducation(@Param('id') id: string, @Body() dto: CreateEducationDto) {
    return this.doctorsService.addEducation(id, dto);
  }

  @Put(':id/education/:educationId')
  @UsePipes(new ZodValidationPipe(CreateEducationSchema))
  async updateEducation(
    @Param('educationId') educationId: string,
    @Body() dto: Partial<CreateEducationDto>,
  ) {
    return this.doctorsService.updateEducation(educationId, dto);
  }

  @Delete(':id/education/:educationId')
  async removeEducation(@Param('educationId') educationId: string) {
    return this.doctorsService.removeEducation(educationId);
  }

  @Get(':id/certifications')
  async getCertifications(@Param('id') id: string) {
    return this.doctorsService.getCertifications(id);
  }

  @Post(':id/certifications')
  @UsePipes(new ZodValidationPipe(CreateCertificationSchema))
  async addCertification(
    @Param('id') id: string,
    @Body() dto: CreateCertificationDto,
  ) {
    return this.doctorsService.addCertification(id, dto);
  }

  @Put(':id/certifications/:certificationId')
  @UsePipes(new ZodValidationPipe(CreateCertificationSchema))
  async updateCertification(
    @Param('certificationId') certificationId: string,
    @Body() dto: Partial<CreateCertificationDto>,
  ) {
    return this.doctorsService.updateCertification(certificationId, dto);
  }

  @Delete(':id/certifications/:certificationId')
  async removeCertification(@Param('certificationId') certificationId: string) {
    return this.doctorsService.removeCertification(certificationId);
  }

  @Get(':id/specializations')
  async getSpecializations(@Param('id') id: string) {
    return this.doctorsService.getSpecializations(id);
  }

  @Post(':id/specializations')
  @UsePipes(new ZodValidationPipe(AddSpecializationSchema))
  async addSpecialization(
    @Param('id') id: string,
    @Body() dto: AddSpecializationDto,
  ) {
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
  ) {
    return this.doctorsService.removeSpecialization(id, specialization);
  }
}
