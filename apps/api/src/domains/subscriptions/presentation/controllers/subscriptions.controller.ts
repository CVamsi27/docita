import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
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
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
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
import {
  SubscriptionBillingActivateRequestDto,
  SubscriptionBillingCancelRequestDto,
  SubscriptionBillingCheckoutRequestDto,
  SubscriptionBillingPaymentHistoryResponseDto,
  SubscriptionBillingPreviewQueryDto,
} from '@/domains/subscriptions/application/dto/subscriptions-billing.dto';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { APP_ACCESS_TARGETS, currentUsageSchema } from '@workspace/types';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { ZodSerializerDto } from 'nestjs-zod';

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
    private readonly usageTrackingService: UsageTrackingService,
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
  @Get('usage')
  async getCurrentUsage(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) {
      throw new Error('Clinic ID not found');
    }
    const usage = await this.usageTrackingService.getCurrentUsage(
      req.user.clinicId,
    );
    return currentUsageSchema.parse(
      JSON.parse(JSON.stringify(usage)) as unknown,
    );
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
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Get('billing')
  async getBillingStatus(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return this.queryService.getBillingStatus(req.user.clinicId);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Get('billing/payments')
  @ZodSerializerDto(SubscriptionBillingPaymentHistoryResponseDto)
  async getPaymentHistory(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    const payments = (await this.queryService.getPaymentHistory(
      req.user.clinicId,
    )) as Array<{
      id?: string;
      amountCents: number;
      currency: string;
      status?: string;
      invoiceUrl?: string | null;
      invoiceNumber?: string | null;
      description?: string | null;
      paidAt?: Date | null;
      createdAt: Date;
      getStatus?: () => unknown;
    }>;
    return payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      amount: p.amountCents / 100, // legacy alias
      currency: p.currency,
      status: p.status ?? String(p.getStatus?.() ?? 'pending'),
      description: p.description ?? undefined,
      invoiceUrl: p.invoiceUrl ?? undefined,
      invoiceNumber: p.invoiceNumber ?? undefined,
      paidAt: p.paidAt ? p.paidAt.toISOString() : undefined,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Get('billing/preview')
  async getBillingPreview(
    @Request() req: RequestWithUser,
    @Query() query: SubscriptionBillingPreviewQueryDto,
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    const { tier, cycle } = query;
    const subscription = await this.queryService.getSubscriptionDetails(
      req.user.clinicId,
    );
    const pricingOffer = await this.queryService.getClinicPricingOffer(
      req.user.clinicId,
    );
    const newTier = ClinicTier.fromString(tier);
    const newCycle = BillingCycle.fromString(cycle);
    const newPriceCents = this.pricingService.calculatePrice(
      newTier,
      newCycle,
      pricingOffer?.percentOff ?? 0,
    );

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
      pricingOffer?.percentOff ?? 0,
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
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('billing/checkout')
  async billingCheckout(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionBillingCheckoutRequestDto,
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    try {
      return await this.createCheckoutUseCase.execute({
        clinicId: req.user.clinicId,
        tier: body.tier,
        cycle: body.billingCycle,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        /invalid (clinic )?tier/i.test(error.message)
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('billing/activate')
  async billingActivate(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionBillingActivateRequestDto,
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    await this.activateSubscriptionUseCase.execute({
      clinicId: req.user.clinicId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpayOrderId: body.razorpayOrderId,
      razorpaySignature: body.razorpaySignature,
      tier: body.tier,
      cycle: body.billingCycle,
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('billing/cancel')
  async billingCancel(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionBillingCancelRequestDto,
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return this.cancelSubscriptionUseCase.execute({
      clinicId: req.user.clinicId,
      cancelAtPeriodEnd: !body.immediate,
    });
  }
}
