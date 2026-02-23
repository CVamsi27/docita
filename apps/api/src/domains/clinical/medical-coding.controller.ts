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
  UnauthorizedException,
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
import { RequestWithUser } from '../../common/types/common.types';

@Controller('medical-coding')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
@RequireFeature(Feature.MEDICAL_CODING)
export class MedicalCodingController {
  constructor(private readonly medicalCodingService: MedicalCodingService) {}

  private getUserId(req: RequestWithUser): string {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return req.user.id;
  }

  private getClinicId(req: RequestWithUser): string {
    if (!req.user?.clinicId) {
      throw new UnauthorizedException('User clinic not found');
    }
    return req.user.clinicId;
  }

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
  async getFavorites(@Request() req: RequestWithUser) {
    return this.medicalCodingService.getFavorites(this.getUserId(req));
  }

  @Post('favorites')
  @ZodSerializerDto(DoctorFavoriteCodeResponseDto)
  async addFavorite(
    @Request() req: RequestWithUser,
    @Body() dto: AddFavoriteDto,
  ) {
    return this.medicalCodingService.addFavorite(
      this.getUserId(req),
      dto.icdCodeId,
    );
  }

  @Delete('favorites/:icdCodeId')
  async removeFavorite(
    @Request() req: RequestWithUser,
    @Param('icdCodeId') icdCodeId: string,
  ) {
    return this.medicalCodingService.removeFavorite(
      this.getUserId(req),
      icdCodeId,
    );
  }

  // CPT Favorites
  @Get('cpt-favorites')
  @ZodSerializerDto(DoctorFavoriteCodeListResponseDto)
  async getCptFavorites(@Request() req: RequestWithUser) {
    return this.medicalCodingService.getCptFavorites(this.getUserId(req));
  }

  @Post('cpt-favorites')
  @ZodSerializerDto(DoctorFavoriteCodeResponseDto)
  async addCptFavorite(
    @Request() req: RequestWithUser,
    @Body() dto: AddCptFavoriteDto,
  ) {
    return this.medicalCodingService.addCptFavorite(
      this.getUserId(req),
      dto.cptCodeId,
    );
  }

  @Delete('cpt-favorites/:cptCodeId')
  async removeCptFavorite(
    @Request() req: RequestWithUser,
    @Param('cptCodeId') cptCodeId: string,
  ) {
    return this.medicalCodingService.removeCptFavorite(
      this.getUserId(req),
      cptCodeId,
    );
  }

  @Get('uncoded')
  @ZodSerializerDto(UncodedVisitListResponseDto)
  async getUncodedVisits(
    @Request() req: RequestWithUser,
    @Query('search') search?: string,
  ) {
    return this.medicalCodingService.getUncodedVisits(
      this.getClinicId(req),
      search,
    );
  }
}
