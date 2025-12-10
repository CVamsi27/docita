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
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Specialization, HospitalRole } from '@workspace/db';

interface AuthRequest {
  user: {
    clinicId: string;
    userId: string;
    role: string;
  };
}

interface CreateDoctorDto {
  email: string;
  password: string;
  name: string;
  role?: string;
  specialization?: Specialization;
  hospitalRole?: HospitalRole;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  phoneNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
}

interface UpdateDoctorDto {
  name?: string;
  email?: string;
  specialization?: Specialization;
  hospitalRole?: HospitalRole;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  signatureUrl?: string;
  profilePhotoUrl?: string;
  phoneNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  role?: string;
}

interface CreateEducationDto {
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  location?: string;
  startYear?: number;
  endYear?: number;
  isOngoing?: boolean;
  grade?: string;
  thesis?: string;
  order?: number;
}

interface CreateCertificationDto {
  name: string;
  issuingBody: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

interface AddSpecializationDto {
  specialization: Specialization;
  yearsOfPractice?: number;
}

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
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
  async findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Post()
  async create(@Request() req: AuthRequest, @Body() data: CreateDoctorDto) {
    // Only ADMIN and ADMIN_DOCTOR can create members
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ADMIN_DOCTOR') {
      throw new ForbiddenException('Only admins can create members');
    }
    return this.doctorsService.create(req.user.clinicId, data);
  }

  @Put(':id')
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() data: UpdateDoctorDto,
  ) {
    // Only ADMIN and ADMIN_DOCTOR can update members
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ADMIN_DOCTOR') {
      throw new ForbiddenException('Only admins can update members');
    }
    return this.doctorsService.update(id, data);
  }

  @Delete(':id')
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    // Only ADMIN and ADMIN_DOCTOR can delete members
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ADMIN_DOCTOR') {
      throw new ForbiddenException('Only admins can delete members');
    }
    return this.doctorsService.remove(id);
  }

  // ============================================================================
  // Education Endpoints
  // ============================================================================

  @Get(':id/education')
  async getEducation(@Param('id') id: string) {
    return this.doctorsService.getEducationHistory(id);
  }

  @Post(':id/education')
  async addEducation(
    @Param('id') id: string,
    @Body() data: CreateEducationDto,
  ) {
    return this.doctorsService.addEducation(id, data);
  }

  @Put(':id/education/:educationId')
  async updateEducation(
    @Param('educationId') educationId: string,
    @Body() data: Partial<CreateEducationDto>,
  ) {
    return this.doctorsService.updateEducation(educationId, data);
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
  async addCertification(
    @Param('id') id: string,
    @Body() data: CreateCertificationDto,
  ) {
    return this.doctorsService.addCertification(id, data);
  }

  @Put(':id/certifications/:certificationId')
  async updateCertification(
    @Param('certificationId') certificationId: string,
    @Body() data: Partial<CreateCertificationDto>,
  ) {
    return this.doctorsService.updateCertification(certificationId, data);
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
  async addSpecialization(
    @Param('id') id: string,
    @Body() data: AddSpecializationDto,
  ) {
    return this.doctorsService.addSpecialization(
      id,
      data.specialization,
      data.yearsOfPractice,
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
