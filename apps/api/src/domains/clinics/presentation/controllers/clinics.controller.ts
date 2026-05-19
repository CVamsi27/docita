import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  Query,
  ForbiddenException,
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
  ClinicCreateMemberDto,
  ClinicCreateReceptionistDto,
  ClinicResponseDto,
  ClinicListResponseDto,
  CreateClinicSchema,
} from '@/domains/clinics/application/dto/clinics.dto';
import {
  createDataSubjectRequestSchema,
  dataSubjectRequestStatusSchema,
  updateDataSubjectRequestSchema,
  type CreateDataSubjectRequest,
  type UpdateDataSubjectRequest,
} from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { UserResponseDto } from '@/domains/users/application/dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { RequestWithUser } from '@/shared/common/types/common.types';

@Controller('clinics')
@Roles(Role.INTERNAL)
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

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  @Get(':id/compliance')
  async getComplianceSummary(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    if (req.user?.clinicId !== id) {
      throw new ForbiddenException(
        'You can only view compliance for your own clinic',
      );
    }

    return this.clinicsService.getComplianceSummary(id);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Get(':id/data-subject-requests')
  async listDataSubjectRequests(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    this.assertOwnClinic(req, id);
    const parsedStatus = status
      ? dataSubjectRequestStatusSchema.safeParse(status)
      : undefined;

    if (parsedStatus && !parsedStatus.success) {
      throw new BadRequestException('Invalid request status');
    }

    return this.clinicsService.listDataSubjectRequests(id, parsedStatus?.data);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Post(':id/data-subject-requests')
  @UsePipes(new ZodValidationPipe(createDataSubjectRequestSchema))
  async createDataSubjectRequest(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: CreateDataSubjectRequest,
  ) {
    this.assertOwnClinic(req, id);

    return this.clinicsService.createDataSubjectRequest(
      id,
      body,
      this.getUserId(req),
      this.getIpAddress(req),
    );
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Patch(':id/data-subject-requests/:requestId')
  @UsePipes(new ZodValidationPipe(updateDataSubjectRequestSchema))
  async updateDataSubjectRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Request() req: RequestWithUser,
    @Body() body: UpdateDataSubjectRequest,
  ) {
    this.assertOwnClinic(req, id);

    return this.clinicsService.updateDataSubjectRequest(
      id,
      requestId,
      body,
      this.getUserId(req),
      this.getIpAddress(req),
    );
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

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Post(':clinicId/members')
  @ZodSerializerDto(UserResponseDto)
  async createMember(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCreateMemberDto,
    @Request() req: RequestWithUser,
  ) {
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only create members in your own clinic',
      );
    }
    return this.clinicsService.createMember(clinicId, dto);
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

  private assertOwnClinic(req: RequestWithUser, clinicId: string): void {
    if (req.user?.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only manage compliance for your own clinic',
      );
    }
  }

  private getUserId(req: RequestWithUser): string {
    if (!req.user?.id) {
      throw new ForbiddenException('Authenticated user is required');
    }

    return req.user.id;
  }

  private getIpAddress(req: RequestWithUser): string | undefined {
    return req.ip || req.socket?.remoteAddress;
  }
}
