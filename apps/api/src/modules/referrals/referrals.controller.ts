/**
 * Referrals Controller
 * API endpoints for referral program
 */

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
  Query,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ReferralsService } from './referrals.service';
import { ApplyReferralDto } from './dto/referrals.dto';

interface AuthRequest {
  user: {
    clinicId: string;
    userId: string;
  };
}

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  private readonly logger = new Logger(ReferralsController.name);

  constructor(private referralsService: ReferralsService) {}

  /**
   * Get referral code data for current clinic
   */
  @Get('code')
  async getMyReferralCode(@Request() req: AuthRequest) {
    return this.referralsService.getReferralLinkData(req.user.clinicId);
  }

  /**
   * Get referral statistics for current clinic
   */
  @Get('stats')
  async getMyReferralStats(@Request() req: AuthRequest) {
    return this.referralsService.getReferralStats(req.user.clinicId);
  }

  /**
   * Get referral history for current clinic
   */
  @Get('history')
  async getMyReferralHistory(@Request() req: AuthRequest) {
    return this.referralsService.getReferralHistory(req.user.clinicId);
  }

  /**
   * Validate a referral code (public endpoint during signup)
   */
  @Get('validate')
  async validateReferralCode(
    @Query('code') code: string,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.referralsService.validateReferralCode(code, clinicId);
  }

  /**
   * Apply a referral code to clinic
   */
  @Post('apply')
  async applyReferralCode(
    @Request() req: AuthRequest,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.referralsService.applyReferralCode(
      req.user.clinicId,
      dto.referralCode,
      dto.email || '',
    );
  }

  /**
   * Check if current clinic has a pending referral discount
   */
  @Get('discount')
  async getMyReferralDiscount(@Request() req: AuthRequest) {
    return this.referralsService.getReferralDiscount(req.user.clinicId);
  }
}
