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
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/common/types/common.types';
import { PrismaService } from '@/prisma/prisma.service';
import { z } from 'zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

const medicalCodingSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    provider: z.string().min(1).optional(),
    autoSuggest: z.boolean().optional(),
    preferredSystem: z.string().min(1).optional(),
  })
  .strict();

@Controller('clinical/medical-coding')
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_MEDICAL_CODING))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_MEDICAL_CODING))
export class MedicalCodingController {
  constructor(
    private readonly clinicalService: ClinicalService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('icd/search')
  async searchIcd(@Query('q') query: string): Promise<IcdCode[]> {
    return await this.clinicalService.searchIcdCodes(query);
  }

  @Get('icd/favorites')
  async getFavorites(
    @Request() req: RequestWithUser,
  ): Promise<(IcdCode | null)[]> {
    return await this.clinicalService.getFavorites(req.user!.id);
  }

  @Get('icd/common')
  async getCommonIcdCodes(@Query('limit') limit?: string): Promise<IcdCode[]> {
    return await this.clinicalService.getCommonIcdCodes(
      limit ? Number(limit) : 50,
    );
  }

  @Post('icd/favorites')
  async addFavorite(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.clinicalService.addFavorite(
      req.user!.id,
      code,
      description,
      category,
    );
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
    return await this.clinicalService.searchCptCodes(query);
  }

  @Get('cpt/favorites')
  async getCptFavorites(
    @Request() req: RequestWithUser,
  ): Promise<(CptCode | null)[]> {
    return await this.clinicalService.getCptFavorites(req.user!.id);
  }

  @Get('cpt/common')
  async getCommonCptCodes(@Query('limit') limit?: string): Promise<CptCode[]> {
    return await this.clinicalService.getCommonCptCodes(
      limit ? Number(limit) : 50,
    );
  }

  @Post('cpt/favorites')
  async addCptFavorite(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.clinicalService.addCptFavorite(
      req.user!.id,
      code,
      description,
      category,
    );
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
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: req.user!.clinicId! },
      select: { settings: true },
    });

    const settings =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};

    return {
      enabled: settings.medicalCodingEnabled !== false,
      provider:
        typeof settings.medicalCodingProvider === 'string'
          ? settings.medicalCodingProvider
          : 'internal',
      autoSuggest: settings.medicalCodingAutoSuggest !== false,
      preferredSystem:
        typeof settings.medicalCodingPreferredSystem === 'string'
          ? settings.medicalCodingPreferredSystem
          : 'ICD-10',
    };
  }

  @Put('settings')
  @UsePipes(new ZodValidationPipe(medicalCodingSettingsSchema))
  async updateCodingSettings(
    @Request() req: RequestWithUser,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = medicalCodingSettingsSchema.parse(body);
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: req.user!.clinicId! },
      select: { settings: true },
    });

    const currentSettings =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};

    await this.prisma.clinic.update({
      where: { id: req.user!.clinicId! },
      data: {
        settings: {
          ...currentSettings,
          ...(parsed.enabled !== undefined
            ? { medicalCodingEnabled: parsed.enabled }
            : {}),
          ...(parsed.provider !== undefined
            ? { medicalCodingProvider: parsed.provider }
            : {}),
          ...(parsed.autoSuggest !== undefined
            ? { medicalCodingAutoSuggest: parsed.autoSuggest }
            : {}),
          ...(parsed.preferredSystem !== undefined
            ? { medicalCodingPreferredSystem: parsed.preferredSystem }
            : {}),
        },
      },
    });

    return { success: true };
  }
}
