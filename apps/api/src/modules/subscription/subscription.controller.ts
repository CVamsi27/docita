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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { SubscriptionService } from './subscription.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import {
  SubscriptionResponseDto,
  SubscriptionTierConfigResponseDto,
  SubscriptionTierConfigListResponseDto,
  IntelligenceInfoResponseDto,
  CheckoutSessionResponseDto,
  UpgradePreviewResponseDto,
  AnyResponseDto,
  CreateCheckoutRequestDto,
  ActivateSubscriptionRequestDto,
  UpgradeTierRequestDto,
  SetIntelligenceRequestDto,
} from './dto/subscription.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly billingService: SubscriptionBillingService,
  ) {}

  @Public()
  @Get('config')
  @ZodSerializerDto(SubscriptionTierConfigResponseDto)
  getTierConfig() {
    return this.subscriptionService.getTierConfig();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
  @ZodSerializerDto(SubscriptionResponseDto)
  async getSubscription(@Request() req: AuthRequest) {
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  @Public()
  @Get('tiers')
  @ZodSerializerDto(SubscriptionTierConfigListResponseDto)
  getAllTiers() {
    return this.subscriptionService.getAllTiers();
  }

  @Public()
  @Get('intelligence')
  @ZodSerializerDto(IntelligenceInfoResponseDto)
  getIntelligenceInfo() {
    return this.subscriptionService.getIntelligenceAddonInfo();
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(SubscriptionResponseDto)
  async upgradeTier(
    @Request() req: AuthRequest,
    @Body() body: UpgradeTierRequestDto,
  ) {
    await this.subscriptionService.upgradeTier(req.user.clinicId, body.tier);
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  @Put('intelligence')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(SubscriptionResponseDto)
  async setIntelligence(
    @Request() req: AuthRequest,
    @Body() body: SetIntelligenceRequestDto,
  ) {
    await this.subscriptionService.setIntelligenceAddon(
      req.user.clinicId,
      body.enabled,
    );
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  @Post(':clinicId/trial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ZodSerializerDto(SubscriptionResponseDto)
  async startTrial(
    @Param('clinicId') clinicId: string,
    @Body() body: { tier: string; days?: number },
  ) {
    await this.subscriptionService.startTrial(
      clinicId,
      body.tier,
      body.days || 14,
    );
    return this.subscriptionService.getSubscription(clinicId);
  }

  @Put(':clinicId/features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ZodSerializerDto(SubscriptionResponseDto)
  async setFeatureOverrides(
    @Param('clinicId') clinicId: string,
    @Body() body: { features: Record<string, boolean> },
  ) {
    await this.subscriptionService.setFeatureOverrides(clinicId, body.features);
    return this.subscriptionService.getSubscription(clinicId);
  }

  // =========================================================================
  // Billing Endpoints
  // =========================================================================

  /**
   * Get billing details for current clinic
   */
  @Get('billing')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
  @ZodSerializerDto(AnyResponseDto) // Custom object likely
  async getBillingDetails(@Request() req: AuthRequest) {
    return this.billingService.getClinicBillingDetails(req.user.clinicId);
  }

  /**
   * Preview upgrade/change proration
   */
  @Get('billing/preview')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
  @ZodSerializerDto(UpgradePreviewResponseDto)
  async previewUpgrade(
    @Request() req: AuthRequest,
    @Query('tier') tier: 'CAPTURE' | 'CORE' | 'PLUS' | 'PRO' | 'ENTERPRISE',
    @Query('cycle') cycle: 'MONTHLY' | 'YEARLY',
    @Query('addOns') addOnsRaw?: string,
  ) {
    const addOns = addOnsRaw ? addOnsRaw.split(',') : [];
    return this.billingService.previewUpgrade(
      req.user.clinicId,
      tier,
      cycle,
      addOns,
    );
  }

  /**
   * Create checkout session for new subscription or upgrade
   */
  @Post('billing/checkout')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
  @ZodSerializerDto(CheckoutSessionResponseDto)
  async createCheckout(
    @Request() req: AuthRequest,
    @Body() dto: CreateCheckoutRequestDto,
  ) {
    return this.billingService.createCheckout(
      req.user.clinicId,
      dto.tier as any,
      dto.billingCycle as any,
      dto.referralCode,
      dto.addOns || [],
    );
  }

  /**
   * Activate subscription after payment
   */
  @Post('billing/activate')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
  @ZodSerializerDto(SubscriptionResponseDto)
  async activateSubscription(
    @Request() req: AuthRequest,
    @Body() dto: ActivateSubscriptionRequestDto,
  ) {
    await this.billingService.activateSubscription(
      req.user.clinicId,
      dto.razorpayPaymentId,
      dto.razorpayOrderId,
      dto.razorpaySignature,
      dto.tier as any,
      dto.billingCycle as any,
      dto.addOns || [],
    );
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  /**
   * Cancel subscription (end of current period)
   */
  @Post('billing/cancel')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
  @ZodSerializerDto(SubscriptionResponseDto)
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
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async getPaymentHistory(@Request() req: AuthRequest) {
    return this.billingService.getPaymentHistory(req.user.clinicId);
  }

  /**
   * Get upcoming invoice preview
   */
  @Get('billing/upcoming')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async getUpcomingInvoice(@Request() req: AuthRequest) {
    return this.billingService.getUpcomingInvoice(req.user.clinicId);
  }

  // =========================================================================
  // Auto-Pay & Payment Method Management
  // =========================================================================

  /**
   * Save payment method (card/bank token from Razorpay)
   */
  @Post('billing/payment-method')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async savePaymentMethod(
    @Request() req: AuthRequest,
    @Body()
    body: { razorpayTokenId: string; methodType: 'CARD' | 'BANK_TRANSFER' },
  ) {
    return this.billingService.savePaymentMethod(
      req.user.clinicId,
      body.razorpayTokenId,
      body.methodType,
    );
  }

  /**
   * Get saved payment method
   */
  @Get('billing/payment-method')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async getPaymentMethod(@Request() req: AuthRequest) {
    return this.billingService.getPaymentMethod(req.user.clinicId);
  }

  /**
   * Enable/disable auto-pay
   */
  @Post('billing/auto-pay')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async setAutoPay(
    @Request() req: AuthRequest,
    @Body() body: { enabled: boolean },
  ) {
    return this.billingService.setAutoPay(req.user.clinicId, body.enabled);
  }

  /**
   * Make one-time payment
   */
  @Post('billing/make-payment')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async makePayment(
    @Request() req: AuthRequest,
    @Body() body: { amountCents: number; description?: string },
  ) {
    return this.billingService.createPaymentCheckout(
      req.user.clinicId,
      body.amountCents,
      body.description,
    );
  }
}
