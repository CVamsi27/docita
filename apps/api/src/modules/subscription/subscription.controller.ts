import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  Query,
  UsePipes,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { SubscriptionService } from './subscription.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import { ClinicTier, BillingCycle, Role } from '@workspace/db';
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
  StartTrialRequestDto,
  SetFeatureOverridesRequestDto,
  CancelSubscriptionRequestDto,
  SavePaymentMethodRequestDto,
  SetAutoPayRequestDto,
  MakePaymentRequestDto,
  CreateCheckoutSchema,
} from './dto/subscription.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

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
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(SubscriptionResponseDto)
  async upgradeTier(
    @Request() req: AuthRequest,
    @Body() body: UpgradeTierRequestDto,
  ) {
    await this.subscriptionService.upgradeTier(req.user.clinicId, body.tier);
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  @Put('intelligence')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.ADMIN_DOCTOR)
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
  @Roles(Role.SUPER_ADMIN)
  @ZodSerializerDto(SubscriptionResponseDto)
  async startTrial(
    @Param('clinicId') clinicId: string,
    @Body() dto: StartTrialRequestDto,
  ) {
    await this.subscriptionService.startTrial(
      clinicId,
      dto.tier,
      dto.days || 14,
    );
    return this.subscriptionService.getSubscription(clinicId);
  }

  @Put(':clinicId/features')
  @Roles(Role.SUPER_ADMIN)
  @ZodSerializerDto(SubscriptionResponseDto)
  async setFeatureOverrides(
    @Param('clinicId') clinicId: string,
    @Body() dto: SetFeatureOverridesRequestDto,
  ) {
    await this.subscriptionService.setFeatureOverrides(clinicId, dto.features);
    return this.subscriptionService.getSubscription(clinicId);
  }

  // =========================================================================
  // Billing Endpoints
  // =========================================================================

  /**
   * Get billing details for current clinic
   */
  @Get('billing')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(AnyResponseDto) // Custom object likely
  async getBillingDetails(@Request() req: AuthRequest) {
    return this.billingService.getClinicBillingDetails(req.user.clinicId);
  }

  /**
   * Preview upgrade/change proration
   */
  @Get('billing/preview')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
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
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(CheckoutSessionResponseDto)
  @UsePipes(new ZodValidationPipe(CreateCheckoutSchema))
  async createCheckout(
    @Request() req: AuthRequest,
    @Body() dto: CreateCheckoutRequestDto,
  ) {
    return this.billingService.createCheckout(
      req.user.clinicId,
      dto.tier as ClinicTier,
      dto.billingCycle as BillingCycle,
      dto.referralCode,
      dto.addOns || [],
    );
  }

  /**
   * Activate subscription after payment
   */
  @Post('billing/activate')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
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
      dto.tier as ClinicTier,
      dto.billingCycle as BillingCycle,
      dto.addOns || [],
    );
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  /**
   * Cancel subscription (end of current period)
   */
  @Post('billing/cancel')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(SubscriptionResponseDto)
  async cancelSubscription(
    @Request() req: AuthRequest,
    @Body() dto: CancelSubscriptionRequestDto,
  ) {
    // Cancel at period end by default (immediate = false means cancel at period end)
    const cancelAtPeriodEnd = !dto.immediate;
    return this.billingService.cancelSubscription(
      req.user.clinicId,
      cancelAtPeriodEnd,
    );
  }

  /**
   * Get payment history
   */
  @Get('billing/payments')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(AnyResponseDto)
  async getPaymentHistory(@Request() req: AuthRequest) {
    return this.billingService.getPaymentHistory(req.user.clinicId);
  }

  /**
   * Get upcoming invoice preview
   */
  @Get('billing/upcoming')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(AnyResponseDto)
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
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(AnyResponseDto)
  async savePaymentMethod(
    @Request() req: AuthRequest,
    @Body() dto: SavePaymentMethodRequestDto,
  ) {
    return this.billingService.savePaymentMethod(
      req.user.clinicId,
      dto.razorpayTokenId,
      dto.methodType,
    );
  }

  /**
   * Get saved payment method
   */
  @Get('billing/payment-method')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(AnyResponseDto)
  async getPaymentMethod(@Request() req: AuthRequest) {
    return this.billingService.getPaymentMethod(req.user.clinicId);
  }

  /**
   * Enable/disable auto-pay
   */
  @Post('billing/auto-pay')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(AnyResponseDto)
  async setAutoPay(
    @Request() req: AuthRequest,
    @Body() dto: SetAutoPayRequestDto,
  ) {
    return this.billingService.setAutoPay(req.user.clinicId, dto.enabled);
  }

  /**
   * Make one-time payment
   */
  @Post('billing/make-payment')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
  @ZodSerializerDto(AnyResponseDto)
  async makePayment(
    @Request() req: AuthRequest,
    @Body() dto: MakePaymentRequestDto,
  ) {
    return this.billingService.createPaymentCheckout(
      req.user.clinicId,
      dto.amountCents,
      dto.description,
    );
  }
}
