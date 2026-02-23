import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  UsePipes,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { Roles } from '../../shared/modules/auth/auth/roles.decorator';
import { Specialization, HospitalRole, Role } from '@workspace/db';

import {
  CreateDoctorDto,
  UpdateDoctorDto,
  CreateEducationDto,
  CreateCertificationDto,
  AddSpecializationDto,
  DoctorResponseDto,
  DoctorListResponseDto,
  CreateDoctorSchema,
  UpdateDoctorSchema,
  CreateEducationSchema,
  CreateCertificationSchema,
  AddSpecializationSchema,
} from './dto/doctors.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    clinicId: string;
    userId: string;
    role: string;
  };
}

@Controller('doctors')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ZodSerializerDto(DoctorListResponseDto)
  async findAll(@Request() req: AuthRequest) {
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
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.doctorsService.findOne(id, req.user.clinicId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  @UsePipes(new ZodValidationPipe(CreateDoctorSchema))
  async create(@Request() req: AuthRequest, @Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(req.user.clinicId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateDoctorSchema))
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ) {
    return this.doctorsService.update(id, dto, req.user.clinicId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.doctorsService.remove(id, req.user.clinicId);
  }

  // ============================================================================
  // Education Endpoints
  // ============================================================================

  @Get(':id/education')
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

  // ============================================================================
  // Certification Endpoints
  // ============================================================================

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

  // ============================================================================
  // Additional Specializations Endpoints
  // ============================================================================

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
