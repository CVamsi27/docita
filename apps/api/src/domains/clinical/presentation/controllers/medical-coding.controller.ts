import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { ClinicalService } from '@/domains/clinical/application/services/clinical.service';
import {
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';

@Controller('clinical/medical-coding')
export class MedicalCodingController {
  constructor(private readonly clinicalService: ClinicalService) {}

  @Get('icd/search')
  async searchIcd(@Query('q') query: string): Promise<IcdCode[]> {
    return await this.clinicalService.searchIcdCodes(query);
  }

  @Get('icd/favorites')
  async getFavorites(
    @Query('userId') userId: string,
  ): Promise<(IcdCode | null)[]> {
    return await this.clinicalService.getFavorites(userId);
  }

  @Get('icd/common')
  async getCommonIcdCodes(@Query('limit') limit?: string): Promise<IcdCode[]> {
    return await this.clinicalService.getCommonIcdCodes(
      limit ? Number(limit) : 50,
    );
  }

  @Post('icd/favorites')
  async addFavorite(
    @Body('userId') userId: string,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.clinicalService.addFavorite(
      userId,
      code,
      description,
      category,
    );
  }

  @Delete('icd/favorites/:icdCodeId')
  async removeFavorite(
    @Query('userId') userId: string,
    @Param('icdCodeId') icdCodeId: string,
  ): Promise<void> {
    return await this.clinicalService.removeFavorite(userId, icdCodeId);
  }

  @Get('cpt/search')
  async searchCpt(@Query('q') query: string): Promise<CptCode[]> {
    return await this.clinicalService.searchCptCodes(query);
  }

  @Get('cpt/favorites')
  async getCptFavorites(
    @Query('userId') userId: string,
  ): Promise<(CptCode | null)[]> {
    return await this.clinicalService.getCptFavorites(userId);
  }

  @Get('cpt/common')
  async getCommonCptCodes(@Query('limit') limit?: string): Promise<CptCode[]> {
    return await this.clinicalService.getCommonCptCodes(
      limit ? Number(limit) : 50,
    );
  }

  @Post('cpt/favorites')
  async addCptFavorite(
    @Body('userId') userId: string,
    @Body('code') code: string,
    @Body('description') description: string,
    @Body('category') category: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.clinicalService.addCptFavorite(
      userId,
      code,
      description,
      category,
    );
  }

  @Delete('cpt/favorites/:cptCodeId')
  async removeCptFavorite(
    @Query('userId') userId: string,
    @Param('cptCodeId') cptCodeId: string,
  ): Promise<void> {
    return await this.clinicalService.removeCptFavorite(userId, cptCodeId);
  }

  @Get('uncoded-visits')
  async getUncodedVisits(
    @Query('clinicId') clinicId: string,
    @Query('search') search?: string,
  ): Promise<Appointment[]> {
    return await this.clinicalService.getUncodedVisits(clinicId, search);
  }
}
