import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import {
  CreateSubscriptionUseCase,
  UpgradeSubscriptionUseCase,
  CancelSubscriptionUseCase,
  ActivateSubscriptionUseCase,
  CreateCheckoutUseCase,
  ProcessWebhookUseCase,
} from '@/domains/subscriptions/application/use-cases';
import { SubscriptionsQueryService } from '@/domains/subscriptions/application/services/subscriptions-query.service';
import { ProratingService } from '@/domains/subscriptions/core/services';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { ClinicTierEnum } from '@/domains/subscriptions/core/value-objects/clinic-tier.value-object';
import { BillingCycleEnum } from '@/domains/subscriptions/core/value-objects/billing-cycle.value-object';
import { RequestWithUser } from '@/common/types/common.types';
import {
  SubscriptionActivateLegacyRequestDto,
  SubscriptionCancelRequestDto,
  SubscriptionCheckoutRequestDto,
} from '@/domains/subscriptions/application/dto/subscriptions-controller.dto';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';

@Controller(['subscriptions', 'subscription'])
@SkipSubscriptionCheck()
export class SubscriptionsController {
  constructor(
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly upgradeSubscriptionUseCase: UpgradeSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly activateSubscriptionUseCase: ActivateSubscriptionUseCase,
    private readonly createCheckoutUseCase: CreateCheckoutUseCase,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    private readonly queryService: SubscriptionsQueryService,
    private readonly proratingService: ProratingService,
    private readonly pricingService: SubscriptionPricingService,
  ) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.queryService.getTierConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrent(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) {
      throw new Error('Clinic ID not found');
    }
    return this.queryService.getSubscriptionDetails(req.user.clinicId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckout(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionCheckoutRequestDto,
  ) {
    if (!req.user?.clinicId) {
      throw new Error('Clinic ID not found');
    }
    return this.createCheckoutUseCase.execute({
      clinicId: req.user.clinicId,
      tier: body.tier as ClinicTierEnum,
      cycle: body.cycle as BillingCycleEnum,
      referrals: body.referrals,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancel(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionCancelRequestDto,
  ) {
    if (!req.user?.clinicId) {
      throw new Error('Clinic ID not found');
    }
    return this.cancelSubscriptionUseCase.execute({
      clinicId: req.user.clinicId,
      reason: body.reason,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('activate-legacy')
  async activateLegacy(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionActivateLegacyRequestDto,
  ) {
    if (!req.user?.clinicId) {
      throw new Error('Clinic ID not found');
    }
    const normalizedBillingCycle: 'MONTHLY' | 'YEARLY' =
      body.cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

    return this.createSubscriptionUseCase.execute({
      clinicId: req.user.clinicId,
      plan: body.tier as ClinicTierEnum,
      billingCycle: normalizedBillingCycle,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('billing')
  async getBillingStatus(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return this.queryService.getBillingStatus(req.user.clinicId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('billing/payments')
  async getPaymentHistory(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    const payments = (await this.queryService.getPaymentHistory(
      req.user.clinicId,
    )) as Array<{
      id?: string;
      amountCents: number;
      currency: string;
      createdAt: Date;
      getStatus: () => unknown;
    }>;
    return payments.map((p) => ({
      id: p.id,
      amount: p.amountCents / 100,
      currency: p.currency,
      status: String(p.getStatus()),
      createdAt: p.createdAt.toISOString(),
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('billing/preview')
  async getBillingPreview(
    @Request() req: RequestWithUser,
    @Query('tier') tier: string,
    @Query('cycle') cycle: string,
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    const subscription = await this.queryService.getSubscriptionDetails(
      req.user.clinicId,
    );
    const newTier = ClinicTier.fromString(tier);
    const newCycle = BillingCycle.fromString(cycle);
    const newPriceCents = this.pricingService.calculatePrice(newTier, newCycle);

    if (!subscription) {
      return {
        currentTier: null,
        newTier: tier,
        currentCycle: null,
        newCycle: cycle,
        creditCents: 0,
        chargeCents: newPriceCents,
        daysRemaining: 0,
        billingCycleDays: newCycle.isYearly() ? 365 : 30,
        finalAmountCents: newPriceCents,
      };
    }

    const currentTierObj = ClinicTier.fromString(subscription.plan);
    const currentCycleObj = BillingCycle.fromString('MONTHLY');
    const currentPriceCents = this.pricingService.calculatePrice(
      currentTierObj,
      currentCycleObj,
    );
    const daysRemaining = subscription.daysRemaining;
    const billingCycleDays = currentCycleObj.isYearly() ? 365 : 30;
    const proration = this.proratingService.createProratedPreview(
      currentPriceCents,
      newPriceCents,
      daysRemaining,
      billingCycleDays,
    );

    return {
      currentTier: subscription.plan,
      newTier: tier,
      currentCycle: 'MONTHLY',
      newCycle: cycle,
      creditCents: proration.credit,
      chargeCents: proration.charge,
      daysRemaining,
      billingCycleDays,
      finalAmountCents: proration.netAmount,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('billing/checkout')
  async billingCheckout(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      tier: string;
      billingCycle: string;
      addOns?: string[];
      referralCode?: string;
    },
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return this.createCheckoutUseCase.execute({
      clinicId: req.user.clinicId,
      tier: body.tier,
      cycle: body.billingCycle,
      addOns: body.addOns,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('billing/activate')
  async billingActivate(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      razorpayPaymentId: string;
      razorpayOrderId: string;
      razorpaySignature: string;
      tier: string;
      billingCycle: string;
      addOns?: string[];
    },
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    await this.activateSubscriptionUseCase.execute({
      clinicId: req.user.clinicId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpayOrderId: body.razorpayOrderId,
      razorpaySignature: body.razorpaySignature,
      tier: body.tier,
      cycle: body.billingCycle,
      addOns: body.addOns,
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('billing/cancel')
  async billingCancel(
    @Request() req: RequestWithUser,
    @Body() body: { immediate?: boolean },
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return this.cancelSubscriptionUseCase.execute({
      clinicId: req.user.clinicId,
      cancelAtPeriodEnd: !body.immediate,
    });
  }
}
