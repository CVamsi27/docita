import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Public } from '../../auth/public.decorator';
import { SubscriptionService } from './subscription.service';
import { SubscriptionBillingService } from './subscription-billing.service';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

interface CreateCheckoutDto {
  tier: 'CAPTURE' | 'CORE' | 'PLUS' | 'PRO' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'YEARLY';
  referralCode?: string;
}

interface ActivateSubscriptionDto {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  tier: 'CAPTURE' | 'CORE' | 'PLUS' | 'PRO' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'YEARLY';
}

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly billingService: SubscriptionBillingService,
  ) {}

  @Public()
  @Get('config')
  getTierConfig() {
    return this.subscriptionService.getTierConfig();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getSubscription(@Request() req: AuthRequest) {
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  @Public()
  @Get('tiers')
  getAllTiers() {
    return this.subscriptionService.getAllTiers();
  }

  @Public()
  @Get('intelligence')
  getIntelligenceInfo() {
    return this.subscriptionService.getIntelligenceAddonInfo();
  }

  @Post('upgrade')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  async upgradeTier(
    @Request() req: AuthRequest,
    @Body() body: { tier: string },
  ) {
    return this.subscriptionService.upgradeTier(req.user.clinicId, body.tier);
  }

  @Put('intelligence')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  async setIntelligence(
    @Request() req: AuthRequest,
    @Body() body: { enabled: boolean },
  ) {
    return this.subscriptionService.setIntelligenceAddon(
      req.user.clinicId,
      body.enabled,
    );
  }

  @Post(':clinicId/trial')
  @Roles('SUPER_ADMIN')
  async startTrial(
    @Param('clinicId') clinicId: string,
    @Body() body: { tier: string; days?: number },
  ) {
    return this.subscriptionService.startTrial(
      clinicId,
      body.tier,
      body.days || 14,
    );
  }

  @Put(':clinicId/features')
  @Roles('SUPER_ADMIN')
  async setFeatureOverrides(
    @Param('clinicId') clinicId: string,
    @Body() body: { features: Record<string, boolean> },
  ) {
    return this.subscriptionService.setFeatureOverrides(
      clinicId,
      body.features,
    );
  }

  // =========================================================================
  // Billing Endpoints
  // =========================================================================

  /**
   * Get billing details for current clinic
   */
  @Get('billing')
  @UseGuards(JwtAuthGuard)
  async getBillingDetails(@Request() req: AuthRequest) {
    return this.billingService.getClinicBillingDetails(req.user.clinicId);
  }

  /**
   * Preview upgrade/change proration
   */
  @Get('billing/preview')
  @UseGuards(JwtAuthGuard)
  async previewUpgrade(
    @Request() req: AuthRequest,
    @Query('tier') tier: 'CAPTURE' | 'CORE' | 'PLUS' | 'PRO' | 'ENTERPRISE',
    @Query('cycle') cycle: 'MONTHLY' | 'YEARLY',
  ) {
    return this.billingService.previewUpgrade(req.user.clinicId, tier, cycle);
  }

  /**
   * Create checkout session for new subscription or upgrade
   */
  @Post('billing/checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @Request() req: AuthRequest,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckout(
      req.user.clinicId,
      dto.tier,
      dto.billingCycle,
      dto.referralCode,
    );
  }

  /**
   * Activate subscription after payment
   */
  @Post('billing/activate')
  @UseGuards(JwtAuthGuard)
  async activateSubscription(
    @Request() req: AuthRequest,
    @Body() dto: ActivateSubscriptionDto,
  ) {
    return this.billingService.activateSubscription(
      req.user.clinicId,
      dto.razorpayPaymentId,
      dto.razorpayOrderId,
      dto.razorpaySignature,
      dto.tier,
      dto.billingCycle,
    );
  }

  /**
   * Cancel subscription (end of current period)
   */
  @Post('billing/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @Request() req: AuthRequest,
    @Body() body: { immediate?: boolean },
  ) {
    // Cancel at period end by default (immediate = false means cancel at period end)
    const cancelAtPeriodEnd = !body.immediate;
    return this.billingService.cancelSubscription(
      req.user.clinicId,
      cancelAtPeriodEnd,
    );
  }

  /**
   * Get payment history
   */
  @Get('billing/payments')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@Request() req: AuthRequest) {
    return this.billingService.getPaymentHistory(req.user.clinicId);
  }

  /**
   * Get upcoming invoice preview
   */
  @Get('billing/upcoming')
  @UseGuards(JwtAuthGuard)
  async getUpcomingInvoice(@Request() req: AuthRequest) {
    return this.billingService.getUpcomingInvoice(req.user.clinicId);
  }
}
