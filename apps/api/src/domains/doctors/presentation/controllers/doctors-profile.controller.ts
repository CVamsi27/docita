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
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  Feature,
  // jscpd:ignore-end
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
} from '@/domains/doctors/application/dto/doctors.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  DoctorsApiAccess,
  assertDoctorUpdatesSelf,
  requireClinicId,
} from '@/domains/doctors/presentation/controllers/doctors.controller.access';

@Controller('doctors')
@DoctorsApiAccess()
export class DoctorsProfileController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ZodSerializerDto(DoctorListResponseDto)
  async findAll(@Request() req: RequestWithUser) {
    return this.doctorsService.findAll(requireClinicId(req));
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
    return this.doctorsService.create(requireClinicId(req), dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  @ZodSerializerDto(DoctorResponseDto)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDoctorSchema)) dto: UpdateDoctorDto,
  ) {
    assertDoctorUpdatesSelf(req, id);
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
    assertDoctorUpdatesSelf(req, id);
    return this.doctorsService.update(
      id,
      {
        registrationNumber: dto.registrationNumber,
        registrationCouncil: dto.registrationCouncil,
        registrationStateCode: dto.registrationStateCode,
      },
      req.user?.clinicId || undefined,
    );
  }

  @Delete(':id')
  @RequireFeature(Feature.ROLE_MANAGEMENT)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.doctorsService.remove(id, req.user?.clinicId || undefined);
  }
}
