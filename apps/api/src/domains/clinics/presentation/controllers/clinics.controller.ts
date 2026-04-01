import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Query,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { ClinicsService } from '@/domains/clinics/application/services/clinics.service';
import { JoinRequestService } from '@/domains/clinics/application/services/join-request.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import {
  CreateClinicDto,
  UpdateClinicDto,
  ClinicCreateDoctorDto,
  ClinicCreateReceptionistDto,
  ClinicUpdateMemberDto,
  ClinicSettingsDto,
  ClinicResponseDto,
  ClinicListResponseDto,
  CreateClinicSchema,
  JoinClinicDto,
  JoinClinicSchema,
} from '@/domains/clinics/application/dto/clinics.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { UserResponseDto } from '@/domains/users/application/dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { RequestWithUser } from '@/common/types/common.types';

@Controller('clinics')
@Roles(Role.SUPER_ADMIN)
export class ClinicsController {
  constructor(
    private readonly clinicsService: ClinicsService,
    private readonly joinRequestService: JoinRequestService,
  ) {}

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

  @Get('user/:userId')
  @ZodSerializerDto(ClinicListResponseDto)
  getUserClinics(@Param('userId') userId: string) {
    return this.clinicsService.getUserClinics(userId);
  }

  @Get(':id/stats')
  getClinicStats(@Param('id') id: string) {
    return this.clinicsService.getClinicStats(id);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Post(':clinicId/doctors')
  @ZodSerializerDto(UserResponseDto)
  async createDoctor(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateDoctorDto,
    @Request() req: RequestWithUser,
  ) {
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only create doctors in your own clinic',
      );
    }
    return this.clinicsService.createDoctor(clinicId, dto);
  }

  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @Get(':clinicId/doctors')
  async getDoctors(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only view doctors in your own clinic',
      );
    }
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
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only create receptionists in your own clinic',
      );
    }
    return this.clinicsService.createReceptionist(clinicId, dto);
  }

  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @Get(':clinicId/receptionists')
  async getReceptionists(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only view receptionists in your own clinic',
      );
    }
    return this.clinicsService.getReceptionists(clinicId);
  }
}

@Controller('clinic')
@SkipSubscriptionCheck()
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class ClinicSettingsController {
  constructor(
    private readonly clinicsService: ClinicsService,
    private readonly joinRequestService: JoinRequestService,
  ) {}

  @Get('settings')
  @ZodSerializerDto(ClinicResponseDto)
  async getSettings(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    const clinic = await this.clinicsService.findOne(clinicId);
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    return clinic;
  }

  @Put('settings')
  @ZodSerializerDto(ClinicResponseDto)
  async updateSettings(
    @Request() req: RequestWithUser,
    @Body() dto: ClinicSettingsDto,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.updateSettings(clinicId, dto);
  }
  @Get('members')
  async getMembers(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.getMembers(clinicId);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Put('members/:memberId')
  async updateMember(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Body() dto: ClinicUpdateMemberDto,
  ) {
    const clinicId = req.user?.clinicId;
    const actorUserId = req.user?.id;
    if (!clinicId || !actorUserId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.updateMember(
      clinicId,
      memberId,
      dto,
      actorUserId,
    );
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Delete('members/:memberId')
  async removeMember(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
  ) {
    const clinicId = req.user?.clinicId;
    const actorUserId = req.user?.id;
    if (!clinicId || !actorUserId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.removeMember(clinicId, memberId, actorUserId);
  }

  @Get('prescription-defaults')
  async getPrescriptionDefaults(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.getPrescriptionDefaults(clinicId);
  }

  @Put('prescription-defaults')
  async updatePrescriptionDefaults(
    @Request() req: RequestWithUser,
    @Body() dto: Record<string, unknown>,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.clinicsService.updatePrescriptionDefaults(clinicId, dto);
  }

  @Get('search-for-join')
  async searchClinicsForJoin(
    @Request() req: RequestWithUser,
    @Query('query') query: string,
  ) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const clinics = await this.clinicsService.searchActive(query);

    const userId = req.user?.id;
    if (!userId) {
      return clinics.map((clinic) => ({
        ...clinic,
        canJoin: true,
        existingRequestStatus: null,
      }));
    }

    const pendingRequests =
      await this.joinRequestService.findUserPendingRequests(userId);

    return clinics.map((clinic) => ({
      ...clinic,
      canJoin: !pendingRequests.some((r) => r.clinicId === clinic.id),
      existingRequestStatus:
        pendingRequests.find((r) => r.clinicId === clinic.id)?.status || null,
    }));
  }

  @Post('join')
  @UsePipes(new ZodValidationPipe(JoinClinicSchema))
  async joinClinic(
    @Request() _req: RequestWithUser,
    @Body() _dto: JoinClinicDto,
  ) {
    throw new BadRequestException(
      'Direct joining is no longer supported. Please submit a join request through the app.',
    );
  }
}
