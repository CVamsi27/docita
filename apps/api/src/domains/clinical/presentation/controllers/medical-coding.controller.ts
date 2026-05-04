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
import type { IcdCode, CptCode, DoctorFavoriteCode } from '@workspace/types';
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
import { RequestWithUser } from '@/common/types/common.types';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

@Controller('clinical/medical-coding')
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
    return (await this.clinicalService.searchIcdCodes(query)) as IcdCode[];
  }

  @Get('icd/favorites')
  async getFavorites(
    @Request() req: RequestWithUser,
  ): Promise<(IcdCode | null)[]> {
    return (await this.clinicalService.getFavorites(
      req.user!.id,
    )) as (IcdCode | null)[];
  }

  @Get('icd/common')
  async getCommonIcdCodes(@Query('limit') limit?: string): Promise<IcdCode[]> {
    return (await this.clinicalService.getCommonIcdCodes(
      limit ? Number(limit) : 50,
    )) as IcdCode[];
  }

  @Post('icd/favorites')
  async addFavorite(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return (await this.clinicalService.addFavorite(
      req.user!.id,
      code,
      description,
      category,
    )) as DoctorFavoriteCode;
  }

  @Delete('icd/favorites/:icdCodeId')
  async removeFavorite(
    @Request() req: RequestWithUser,
    @Param('icdCodeId') icdCodeId: string,
  ): Promise<void> {
    return await this.clinicalService.removeFavorite(req.user!.id, icdCodeId);
  }

  @Get('cpt/search')
  async searchCpt(@Query('q') query: string): Promise<CptCode[]> {
    return (await this.clinicalService.searchCptCodes(query)) as CptCode[];
  }

  @Get('cpt/favorites')
  async getCptFavorites(
    @Request() req: RequestWithUser,
  ): Promise<(CptCode | null)[]> {
    return (await this.clinicalService.getCptFavorites(
      req.user!.id,
    )) as (CptCode | null)[];
  }

  @Get('cpt/common')
  async getCommonCptCodes(@Query('limit') limit?: string): Promise<CptCode[]> {
    return (await this.clinicalService.getCommonCptCodes(
      limit ? Number(limit) : 50,
    )) as CptCode[];
  }

  @Post('cpt/favorites')
  async addCptFavorite(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return (await this.clinicalService.addCptFavorite(
      req.user!.id,
      code,
      description,
      category,
    )) as DoctorFavoriteCode;
  }

  @Delete('cpt/favorites/:cptCodeId')
  async removeCptFavorite(
    @Request() req: RequestWithUser,
    @Param('cptCodeId') cptCodeId: string,
  ): Promise<void> {
    return await this.clinicalService.removeCptFavorite(
      req.user!.id,
      cptCodeId,
    );
  }

  @Get('uncoded-visits')
  async getUncodedVisits(
    @Request() req: RequestWithUser,
    @Query('search') search?: string,
  ): Promise<Appointment[]> {
    return await this.clinicalService.getUncodedVisits(
      req.user!.clinicId!,
      search,
    );
  }

  @Get('settings')
  async getCodingSettings(@Request() req: RequestWithUser) {
    return this.settingsService.getMedicalCodingSettings(req.user!.clinicId!);
  }

  @Put('settings')
  @UsePipes(new ZodValidationPipe(medicalCodingSettingsSchema))
  async updateCodingSettings(
    @Request() req: RequestWithUser,
    @Body() body: MedicalCodingSettings,
  ) {
    return this.settingsService.updateMedicalCodingSettings(
      req.user!.clinicId!,
      body,
    );
  }
}
