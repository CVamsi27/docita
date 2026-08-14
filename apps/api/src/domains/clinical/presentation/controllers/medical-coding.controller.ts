// jscpd:ignore-start
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ClinicalService } from '@/domains/clinical/application/services/clinical.service';
import {
  ClinicalSettingsService,
  medicalCodingSettingsSchema,
  type MedicalCodingSettings,
} from '@/domains/clinical/application/services/clinical-settings.service';
import {
  doctorFavoriteCodeSchema,
  type IcdCode,
  type CptCode,
  type DoctorFavoriteCode,
} from '@workspace/types';
import type { Appointment } from '@workspace/db';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';

@Controller('clinical/medical-coding')
// jscpd:ignore-end
@UseGuards(TierGuard, FrontDeskClinicalBlockGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_MEDICAL_CODING))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_MEDICAL_CODING))
export class MedicalCodingController {
  constructor(
    private readonly clinicalService: ClinicalService,
    private readonly settingsService: ClinicalSettingsService,
  ) {}

  @Get('icd/search')
  async searchIcd(@Query('q') query: string): Promise<IcdCode[]> {
    return this.clinicalService.searchIcdCodes(query);
  }

  @Get('icd/favorites')
  async getFavorites(
    @Request() req: RequestWithUser,
  ): Promise<(IcdCode | null)[]> {
    return this.clinicalService.getFavorites(
      getClinicStaffRequestContext(req).userId,
    );
  }

  @Get('icd/common')
  async getCommonIcdCodes(@Query('limit') limit?: string): Promise<IcdCode[]> {
    return this.clinicalService.getCommonIcdCodes(limit ? Number(limit) : 50);
  }

  @Post('icd/favorites')
  async addFavorite(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return doctorFavoriteCodeSchema.parse(
      await this.clinicalService.addFavorite(
        getClinicStaffRequestContext(req).userId,
        code,
        description,
        category,
      ),
    );
  }

  @Delete('icd/favorites/:icdCodeId')
  async removeFavorite(
    @Request() req: RequestWithUser,
    @Param('icdCodeId') icdCodeId: string,
  ): Promise<void> {
    return await this.clinicalService.removeFavorite(
      getClinicStaffRequestContext(req).userId,
      icdCodeId,
    );
  }

  @Get('cpt/search')
  async searchCpt(@Query('q') query: string): Promise<CptCode[]> {
    return this.clinicalService.searchCptCodes(query);
  }

  @Get('cpt/favorites')
  async getCptFavorites(
    @Request() req: RequestWithUser,
  ): Promise<(CptCode | null)[]> {
    return this.clinicalService.getCptFavorites(
      getClinicStaffRequestContext(req).userId,
    );
  }

  @Get('cpt/common')
  async getCommonCptCodes(@Query('limit') limit?: string): Promise<CptCode[]> {
    return this.clinicalService.getCommonCptCodes(limit ? Number(limit) : 50);
  }

  @Post('cpt/favorites')
  async addCptFavorite(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return doctorFavoriteCodeSchema.parse(
      await this.clinicalService.addCptFavorite(
        getClinicStaffRequestContext(req).userId,
        code,
        description,
        category,
      ),
    );
  }

  @Delete('cpt/favorites/:cptCodeId')
  async removeCptFavorite(
    @Request() req: RequestWithUser,
    @Param('cptCodeId') cptCodeId: string,
  ): Promise<void> {
    return await this.clinicalService.removeCptFavorite(
      getClinicStaffRequestContext(req).userId,
      cptCodeId,
    );
  }

  @Get('uncoded-visits')
  async getUncodedVisits(
    @Request() req: RequestWithUser,
    @Query('search') search?: string,
  ): Promise<Appointment[]> {
    return await this.clinicalService.getUncodedVisits(
      getClinicStaffRequestContext(req).clinicId,
      search,
    );
  }

  @Get('settings')
  async getCodingSettings(@Request() req: RequestWithUser) {
    return this.settingsService.getMedicalCodingSettings(
      getClinicStaffRequestContext(req).clinicId,
    );
  }

  @Put('settings')
  @UsePipes(new ZodValidationPipe(medicalCodingSettingsSchema))
  async updateCodingSettings(
    @Request() req: RequestWithUser,
    @Body() body: MedicalCodingSettings,
  ) {
    return this.settingsService.updateMedicalCodingSettings(
      getClinicStaffRequestContext(req).clinicId,
      body,
    );
  }
}
