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

interface AuthRequest {
  user: {
    clinicId: string;
    userId: string;
  };
}

interface ApplyReferralDto {
  referralCode: string;
  email?: string;
}

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  private readonly logger = new Logger(ReferralsController.name);

  constructor(private referralsService: ReferralsService) {}

  /**
   * Get or generate referral code for current clinic
   */
  @Get('code')
  async getMyReferralCode(@Request() req: AuthRequest) {
    const code = await this.referralsService.getOrCreateReferralCode(
      req.user.clinicId,
    );

    const baseUrl = process.env.FRONTEND_URL || 'https://app.docita.in';
    const referralLink = `${baseUrl}/signup?ref=${code}`;

    return {
      code,
      referralLink,
      rewardDescription: 'Get 1 free month for each clinic that subscribes',
      discountDescription: 'Your referrals get 25% off their first month',
    };
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
