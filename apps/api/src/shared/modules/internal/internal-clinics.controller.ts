import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ClinicTier } from '@workspace/db';
import { ZodSerializerDto } from 'nestjs-zod';
import { ClinicManagementService } from './clinic-management.service';
import { InternalAiService } from './internal-ai.service';
import {
  InternalCreateClinicDto,
  InternalUpdateClinicDto,
  CreateAdminDto,
  UpdateAdminDto,
} from './dto/clinic-management.dto';
import { UpdateAIFeaturesDto } from './dto/ai-management.dto';
import {
  InternalClinicListQueryDto,
  InternalClinicListResponseDto,
  InternalUserListResponseDto,
  InternalUserResponseDto,
  InternalAdminListResponseDto,
  InternalUserListWithClinicResponseDto,
  SuccessResponseDto,
} from './dto/internal.dto';
import { ClinicResponseDto } from '@/domains/clinics/application/dto/clinics.dto';
import { InternalApiAccess } from './internal.controller.access';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';

@Controller('internal')
@InternalApiAccess()
export class InternalClinicsController {
  constructor(
    private readonly clinicService: ClinicManagementService,
    private readonly aiService: InternalAiService,
  ) {}

  @Get('clinics')
  @ZodSerializerDto(InternalClinicListResponseDto)
  async getAllClinics(@Query() query?: InternalClinicListQueryDto) {
    const { cursor, limit } = query ?? {};
    return this.clinicService.getAllClinics({
      cursor,
      limit,
    });
  }

  @Get('clinics/:id/doctors')
  @ZodSerializerDto(InternalUserListResponseDto)
  async getClinicDoctors(@Param('id') id: string) {
    return this.clinicService.getClinicDoctors(id);
  }

  @Get('clinics/:clinicId/doctors/:doctorId')
  async getClinicDoctorDetails(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.clinicService.getClinicDoctorDetails(clinicId, doctorId);
  }

  @Post('clinics')
  @ZodSerializerDto(ClinicResponseDto)
  async createClinic(@Body() data: InternalCreateClinicDto) {
    return this.clinicService.createClinic(data);
  }

  @Patch('clinics/:id/tier')
  @ZodSerializerDto(ClinicResponseDto)
  async updateClinicTier(
    @Param('id') id: string,
    @Body('tier') tier: ClinicTier,
  ) {
    return this.clinicService.updateClinicTier(id, tier);
  }

  @Patch('clinics/:id/status')
  @ZodSerializerDto(ClinicResponseDto)
  async updateClinicStatus(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    return this.clinicService.updateClinicStatus(id, active);
  }

  @Patch('clinics/:id')
  @ZodSerializerDto(ClinicResponseDto)
  async updateClinic(
    @Param('id') id: string,
    @Body() data: InternalUpdateClinicDto,
  ) {
    return this.clinicService.updateClinic(id, data);
  }

  @Get('clinics/:id/admins')
  @ZodSerializerDto(InternalUserListResponseDto)
  async getClinicAdmins(@Param('id') id: string) {
    return this.clinicService.getClinicAdmins(id);
  }

  /** P5.11 — cross-clinic admin list for the internal console. */
  @Get('admins')
  @ZodSerializerDto(InternalAdminListResponseDto)
  async getAllAdmins(@Query('limit') limit?: string) {
    return this.clinicService.getAllAdmins({
      limit: parsePaginationInt(limit, { min: 1, max: 500 }) ?? 200,
    });
  }

  /** P5.11 — cross-clinic users list (with clinic name) for the internal console. */
  @Get('users')
  @ZodSerializerDto(InternalUserListWithClinicResponseDto)
  async getAllUsers(@Query('limit') limit?: string) {
    return this.clinicService.getAllUsers({
      limit: parsePaginationInt(limit, { min: 1, max: 500 }) ?? 200,
    });
  }

  /** P5.11 — cross-clinic admin create for the internal console. */
  @Post('admins')
  @ZodSerializerDto(InternalUserResponseDto)
  async createCrossClinicAdmin(@Body() data: CreateAdminDto) {
    return this.clinicService.createAdmin(data.clinicId, data);
  }

  @Post('clinics/:id/admins')
  @ZodSerializerDto(InternalUserResponseDto)
  async createAdmin(
    @Param('id') clinicId: string,
    @Body() data: CreateAdminDto,
  ) {
    return this.clinicService.createAdmin(clinicId, data);
  }

  @Get('admins/:id')
  @ZodSerializerDto(InternalUserResponseDto)
  async getAdminDetails(@Param('id') id: string) {
    return this.clinicService.getAdminDetails(id);
  }

  @Patch('admins/:id')
  @ZodSerializerDto(InternalUserResponseDto)
  async updateAdmin(@Param('id') id: string, @Body() data: UpdateAdminDto) {
    return this.clinicService.updateAdmin(id, data);
  }

  @Patch('admins/:id/deactivate')
  @ZodSerializerDto(InternalUserResponseDto)
  async deactivateAdmin(@Param('id') id: string) {
    return this.clinicService.deactivateAdmin(id);
  }

  @Patch('admins/:id/activate')
  @ZodSerializerDto(InternalUserResponseDto)
  async activateAdmin(@Param('id') id: string) {
    return this.clinicService.activateAdmin(id);
  }

  @Get('clinics/:id/ai-features')
  async getClinicAIFeatures(@Param('id') id: string) {
    return this.aiService.getClinicAIFeatures(id);
  }

  @Patch('clinics/:id/ai-features')
  @ZodSerializerDto(SuccessResponseDto)
  async updateClinicAIFeatures(
    @Param('id') id: string,
    @Body() data: UpdateAIFeaturesDto,
  ) {
    return this.aiService.updateClinicAIFeatures(id, data);
  }

  @Patch('clinics/:id/enable-ai')
  @ZodSerializerDto(SuccessResponseDto)
  async enableAIFeatures(@Param('id') id: string) {
    return this.aiService.enableAIFeatures(id);
  }

  @Patch('clinics/:id/disable-ai')
  @ZodSerializerDto(SuccessResponseDto)
  async disableAIFeatures(@Param('id') id: string) {
    return this.aiService.disableAIFeatures(id);
  }
}
