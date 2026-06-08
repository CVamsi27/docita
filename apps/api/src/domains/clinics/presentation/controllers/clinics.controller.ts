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
  UsePipes,
} from '@nestjs/common';
import { ClinicsService } from '@/domains/clinics/application/services/clinics.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import {
  CreateClinicDto,
  // jscpd:ignore-end
  UpdateClinicDto,
  ClinicCreateDoctorDto,
  ClinicCreateMemberDto,
  ClinicCreateReceptionistDto,
  ClinicResponseDto,
  ClinicListResponseDto,
  CreateClinicSchema,
} from '@/domains/clinics/application/dto/clinics.dto';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { UserResponseDto } from '@/domains/users/application/dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { assertOwnClinicStaff } from '@/domains/clinics/presentation/controllers/clinics-controller.helpers';

@Controller('clinics')
@Roles(Role.INTERNAL)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @ZodSerializerDto(ClinicResponseDto)
  @UsePipes(new ZodValidationPipe(CreateClinicSchema))
  create(@Body() dto: CreateClinicDto) {
    return this.clinicsService.create(dto);
  }

  @Get()
  @ZodSerializerDto(ClinicListResponseDto)
  findAll() {
    return this.clinicsService.findAll();
  }

  @Get('user/:userId')
  @ZodSerializerDto(ClinicListResponseDto)
  getUserClinics(@Param('userId') userId: string) {
    return this.clinicsService.getUserClinics(userId);
  }

  @Get(':id/stats')
  getClinicStats(@Param('id') id: string) {
    return this.clinicsService.getClinicStats(id);
  }

  @Get(':id')
  @ZodSerializerDto(ClinicResponseDto)
  findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(id);
  }

  @Put(':id')
  @ZodSerializerDto(ClinicResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(id, dto);
  }

  @Delete(':id')
  @ZodSerializerDto(ClinicResponseDto)
  delete(@Param('id') id: string) {
    return this.clinicsService.delete(id);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Post(':clinicId/doctors')
  @ZodSerializerDto(UserResponseDto)
  async createDoctor(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateDoctorDto,
    @Request() req: RequestWithUser,
  ) {
    assertOwnClinicStaff(req, clinicId, 'doctors');
    return this.clinicsService.createDoctor(clinicId, dto);
  }

  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @Get(':clinicId/doctors')
  async getDoctors(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    assertOwnClinicStaff(req, clinicId, 'doctors');
    return this.clinicsService.getDoctors(clinicId);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Post(':clinicId/receptionists')
  @ZodSerializerDto(UserResponseDto)
  async createReceptionist(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateReceptionistDto,
    @Request() req: RequestWithUser,
  ) {
    assertOwnClinicStaff(req, clinicId, 'receptionists');
    return this.clinicsService.createReceptionist(clinicId, dto);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Post(':clinicId/members')
  @ZodSerializerDto(UserResponseDto)
  async createMember(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateMemberDto,
    @Request() req: RequestWithUser,
  ) {
    assertOwnClinicStaff(req, clinicId, 'members');
    return this.clinicsService.createMember(clinicId, dto);
  }

  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @Get(':clinicId/receptionists')
  async getReceptionists(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    assertOwnClinicStaff(req, clinicId, 'receptionists');
    return this.clinicsService.getReceptionists(clinicId);
  }
}
