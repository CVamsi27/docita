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
  ClinicUpdateMemberDto,
  ClinicSettingsDto,
  ClinicResponseDto,
  JoinClinicDto,
  JoinClinicSchema,
} from '@/domains/clinics/application/dto/clinics.dto';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import {
  opdSlipSettingsFormSchema,
  type OpdSlipSettingsFormValues,
} from '@workspace/types';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';

@Controller('clinic')
@SkipSubscriptionCheck()
@Roles(
  Role.ADMIN,
  Role.DOCTOR,
  Role.RECEPTIONIST,
  Role.ADMIN_DOCTOR,
  Role.NURSE,
)
export class ClinicSettingsController {
  constructor(
    private readonly clinicsService: ClinicsService,
    private readonly joinRequestService: JoinRequestService,
  ) {}

  @Get('settings')
  @ZodSerializerDto(ClinicResponseDto)
  async getSettings(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new ForbiddenException('No clinic assigned to this user');
    const clinic = await this.clinicsService.findOne(clinicId);
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Put('settings')
  @ZodSerializerDto(ClinicResponseDto)
  async updateSettings(
    @Request() req: RequestWithUser,
    @Body() dto: ClinicSettingsDto,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new ForbiddenException('No clinic assigned to this user');
    return this.clinicsService.updateSettings(clinicId, dto);
  }

  @Get('members')
  async getMembers(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new ForbiddenException('No clinic assigned to this user');
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
    const actorRole = req.user?.role;
    if (!clinicId || !actorUserId || !actorRole)
      throw new ForbiddenException('No clinic assigned to this user');
    return this.clinicsService.updateMember(clinicId, memberId, dto, actorUserId, actorRole);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Delete('members/:memberId')
  async removeMember(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
  ) {
    const clinicId = req.user?.clinicId;
    const actorUserId = req.user?.id;
    if (!clinicId || !actorUserId)
      throw new ForbiddenException('No clinic assigned to this user');
    return this.clinicsService.removeMember(clinicId, memberId, actorUserId);
  }

  @Get('prescription-defaults')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  async getPrescriptionDefaults(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new ForbiddenException('No clinic assigned to this user');
    return this.clinicsService.getPrescriptionDefaults(clinicId);
  }

  @Put('prescription-defaults')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  async updatePrescriptionDefaults(
    @Request() req: RequestWithUser,
    @Body() dto: Record<string, unknown>,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new ForbiddenException('No clinic assigned to this user');
    return this.clinicsService.updatePrescriptionDefaults(clinicId, dto);
  }

  @Get('opd-slip-settings')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.RECEPTIONIST)
  async getOpdSlipSettings(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new ForbiddenException('No clinic assigned to this user');
    return this.clinicsService.getOpdSlipSettings(clinicId);
  }

  @Put('opd-slip-settings')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @UsePipes(new ZodValidationPipe(opdSlipSettingsFormSchema.partial()))
  async updateOpdSlipSettings(
    @Request() req: RequestWithUser,
    @Body() dto: Partial<OpdSlipSettingsFormValues>,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new ForbiddenException('No clinic assigned to this user');
    return this.clinicsService.updateOpdSlipSettings(clinicId, dto);
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
      return clinics.map((clinic) => ({ ...clinic, canJoin: true, existingRequestStatus: null }));
    }

    const pendingRequests = await this.joinRequestService.findUserPendingRequests(userId);

    return clinics.map((clinic) => ({ ...clinic, canJoin: !pendingRequests.some((r) => r.clinicId === clinic.id), existingRequestStatus: pendingRequests.find((r) => r.clinicId === clinic.id)?.status || null }));
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
