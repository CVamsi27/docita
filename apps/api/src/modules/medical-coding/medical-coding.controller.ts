import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MedicalCodingService } from './medical-coding.service';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import {
  AddFavoriteDto,
  AddCptFavoriteDto,
  IcdCodeListResponseDto,
  CptCodeListResponseDto,
  DoctorFavoriteCodeListResponseDto,
  DoctorFavoriteCodeResponseDto,
  UncodedVisitListResponseDto,
} from './dto/medical-coding.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('medical-coding')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
@RequireFeature(Feature.MEDICAL_CODING)
export class MedicalCodingController {
  constructor(private readonly medicalCodingService: MedicalCodingService) {}

  @Get('icd-codes')
  @ZodSerializerDto(IcdCodeListResponseDto)
  async searchIcdCodes(@Query('search') search: string) {
    return this.medicalCodingService.searchIcdCodes(search);
  }

  @Get('cpt-codes')
  @ZodSerializerDto(CptCodeListResponseDto)
  async searchCptCodes(@Query('search') search: string) {
    return this.medicalCodingService.searchCptCodes(search);
  }

  @Get('favorites')
  @ZodSerializerDto(DoctorFavoriteCodeListResponseDto)
  async getFavorites(@Request() req: any) {
    return this.medicalCodingService.getFavorites(req.user.id);
  }

  @Post('favorites')
  @ZodSerializerDto(DoctorFavoriteCodeResponseDto)
  async addFavorite(@Request() req: any, @Body() dto: AddFavoriteDto) {
    return this.medicalCodingService.addFavorite(req.user.id, dto.icdCodeId);
  }

  @Delete('favorites/:icdCodeId')
  async removeFavorite(
    @Request() req: any,
    @Param('icdCodeId') icdCodeId: string,
  ) {
    return this.medicalCodingService.removeFavorite(req.user.id, icdCodeId);
  }

  // CPT Favorites
  @Get('cpt-favorites')
  @ZodSerializerDto(DoctorFavoriteCodeListResponseDto)
  async getCptFavorites(@Request() req: any) {
    return this.medicalCodingService.getCptFavorites(req.user.id);
  }

  @Post('cpt-favorites')
  @ZodSerializerDto(DoctorFavoriteCodeResponseDto)
  async addCptFavorite(@Request() req: any, @Body() dto: AddCptFavoriteDto) {
    return this.medicalCodingService.addCptFavorite(req.user.id, dto.cptCodeId);
  }

  @Delete('cpt-favorites/:cptCodeId')
  async removeCptFavorite(
    @Request() req: any,
    @Param('cptCodeId') cptCodeId: string,
  ) {
    return this.medicalCodingService.removeCptFavorite(req.user.id, cptCodeId);
  }

  @Get('uncoded')
  @ZodSerializerDto(UncodedVisitListResponseDto)
  async getUncodedVisits(
    @Request() req: any,
    @Query('search') search?: string,
  ) {
    return this.medicalCodingService.getUncodedVisits(
      req.user.clinicId,
      search,
    );
  }
}
