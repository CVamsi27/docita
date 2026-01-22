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
} from './dto/subscription.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

interface CreateCheckoutDto {
  tier: 'CAPTURE' | 'CORE' | 'PLUS' | 'PRO' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'YEARLY';
  referralCode?: string;
  addOns?: string[];
}

interface ActivateSubscriptionDto {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  tier: 'CAPTURE' | 'CORE' | 'PLUS' | 'PRO' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'YEARLY';
  addOns?: string[];
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
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(SubscriptionResponseDto)
  async upgradeTier(
    @Request() req: AuthRequest,
    @Body() body: { tier: string },
  ) {
    return this.subscriptionService.upgradeTier(req.user.clinicId, body.tier);
  }

  @Put('intelligence')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(SubscriptionResponseDto)
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
  @ZodSerializerDto(SubscriptionResponseDto)
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
  @ZodSerializerDto(SubscriptionResponseDto)
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
  @ZodSerializerDto(AnyResponseDto) // Custom object likely
  async getBillingDetails(@Request() req: AuthRequest) {
    return this.billingService.getClinicBillingDetails(req.user.clinicId);
  }

  /**
   * Preview upgrade/change proration
   */
  @Get('billing/preview')
  @UseGuards(JwtAuthGuard)
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
  @ZodSerializerDto(CheckoutSessionResponseDto)
  async createCheckout(
    @Request() req: AuthRequest,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckout(
      req.user.clinicId,
      dto.tier,
      dto.billingCycle,
      dto.referralCode,
      dto.addOns || [],
    );
  }

  /**
   * Activate subscription after payment
   */
  @Post('billing/activate')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(SubscriptionResponseDto)
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
      dto.addOns || [],
    );
  }

  /**
   * Cancel subscription (end of current period)
   */
  @Post('billing/cancel')
  @UseGuards(JwtAuthGuard)
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
