import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  CreateSubscriptionUseCase,
  UpgradeSubscriptionUseCase,
  CancelSubscriptionUseCase,
  ActivateSubscriptionUseCase,
  CreateCheckoutUseCase,
  ResumeSubscriptionPaymentUseCase,
  ProcessWebhookUseCase,
  SchedulePlanChangeUseCase,
} from '@/domains/subscriptions/application/use-cases';
import { SubscriptionsQueryService } from '@/domains/subscriptions/application/services/subscriptions-query.service';
import {
  finalizePayableAmountPaise,
  SubscriptionCheckoutPricingService,
} from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
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
  SubscriptionBillingResumePaymentResponseDto,
} from '@/domains/subscriptions/application/dto/subscriptions-billing.dto';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import {
  APP_ACCESS_TARGETS,
  currentUsageSchema,
  subscriptionBillingActivateResponseSchema,
  subscriptionBillingCancelResponseSchema,
  subscriptionBillingCheckoutResponseSchema,
  subscriptionBillingPreviewResponseSchema,
  subscriptionBillingStatusResponseSchema,
  subscriptionCurrentResponseSchema,
  SUBSCRIPTION_TRIAL_DAYS,
} from '@workspace/types';
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
    private readonly resumeSubscriptionPaymentUseCase: ResumeSubscriptionPaymentUseCase,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    private readonly queryService: SubscriptionsQueryService,
    private readonly checkoutPricingService: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly schedulePlanChangeUseCase: SchedulePlanChangeUseCase,
  ) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.queryService.getTierConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Get('current')
  async getCurrent(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) {
      throw new Error('Clinic ID not found');
    }
    return subscriptionCurrentResponseSchema.parse(
      await this.queryService.getSubscriptionDetails(req.user.clinicId),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
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
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
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
      currentPeriodEnd: new Date(
        Date.now() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000,
      ),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Get('billing')
  async getBillingStatus(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return subscriptionBillingStatusResponseSchema.parse(
      await this.queryService.getBillingStatus(req.user.clinicId),
    );
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
      subtotalCents?: number | null;
      taxCents?: number | null;
      grandTotalCents?: number | null;
      currency: string;
      status?: string;
      invoiceUrl?: string | null;
      invoiceNumber?: string | null;
      invoiceType?: string | null;
      taxSummary?: unknown;
      description?: string | null;
      paidAt?: Date | null;
      createdAt: Date;
      getStatus?: () => unknown;
    }>;
    return payments.map((p) => {
      const status = (
        p.status ?? String(p.getStatus?.() ?? 'pending')
      ).toLowerCase();
      // Razorpay is the source of truth for invoice PDFs. We surface its
      // hosted short_url as the receipt link; in-house PDF generation is gone.
      const receiptUrl =
        status === 'paid' && typeof p.invoiceUrl === 'string'
          ? p.invoiceUrl
          : undefined;
      return {
        id: p.id,
        amountCents: p.amountCents,
        amount: p.amountCents / 100, // legacy alias
        subtotalCents: p.subtotalCents ?? undefined,
        taxCents: p.taxCents ?? undefined,
        grandTotalCents: p.grandTotalCents ?? undefined,
        currency: p.currency,
        status,
        description: p.description ?? undefined,
        payUrl: status === 'paid' ? undefined : (p.invoiceUrl ?? undefined),
        receiptUrl,
        invoiceUrl: p.invoiceUrl ?? undefined,
        invoiceNumber: p.invoiceNumber ?? undefined,
        invoiceType: p.invoiceType ?? undefined,
        taxSummary: p.taxSummary ?? undefined,
        paidAt: p.paidAt ? p.paidAt.toISOString() : undefined,
        createdAt: p.createdAt.toISOString(),
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('billing/payments/:id/resume')
  @ZodSerializerDto(SubscriptionBillingResumePaymentResponseDto)
  async resumePayment(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return this.resumeSubscriptionPaymentUseCase.execute({
      clinicId: req.user.clinicId,
      paymentId: id,
    });
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
    const subscriptionEntity = await this.queryService.findSubscriptionEntity(
      req.user.clinicId,
    );
    const pricingOffer = await this.queryService.getClinicPricingOffer(
      req.user.clinicId,
    );
    const offerPercent = pricingOffer?.percentOff ?? 0;
    const newTier = ClinicTier.fromString(tier);
    const newCycle = BillingCycle.fromString(cycle);
    const currencyCode = this.configService.getCurrencyCode();

    const breakdown = this.checkoutPricingService.compute(
      subscriptionEntity,
      newTier,
      newCycle,
      offerPercent,
    );

    const payableFinal = finalizePayableAmountPaise(
      breakdown.finalAmountCents,
      currencyCode,
    );

    return subscriptionBillingPreviewResponseSchema.parse({
      currentTier: breakdown.currentTier,
      newTier: breakdown.newTier,
      currentCycle: breakdown.currentCycle,
      newCycle: breakdown.newCycle,
      creditCents: breakdown.creditCents,
      chargeCents: breakdown.chargeCents,
      daysRemaining: breakdown.daysRemaining,
      billingCycleDays: breakdown.billingCycleDays,
      finalAmountCents: payableFinal,
    });
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
      return subscriptionBillingCheckoutResponseSchema.parse(
        await this.createCheckoutUseCase.execute({
          clinicId: req.user.clinicId,
          tier: body.tier,
          cycle: body.billingCycle,
        }),
      );
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
    return subscriptionBillingActivateResponseSchema.parse({ success: true });
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('billing/cancel')
  async billingCancel(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionBillingCancelRequestDto,
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    await this.cancelSubscriptionUseCase.execute({
      clinicId: req.user.clinicId,
      cancelAtPeriodEnd: !body.immediate,
    });
    return subscriptionBillingCancelResponseSchema.parse({ success: true });
  }

  /**
   * Schedules a plan change (typically a downgrade) to apply at the current
   * period end. No payment is taken now; current tier features remain until
   * the scheduled date.
   */
  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('billing/schedule-change')
  async scheduleChange(
    @Request() req: RequestWithUser,
    @Body() body: { tier: string; billingCycle: string },
  ) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return this.schedulePlanChangeUseCase.execute({
      clinicId: req.user.clinicId,
      tier: body.tier,
      cycle: body.billingCycle,
    });
  }

  /** Cancels a previously scheduled plan change. */
  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('billing/schedule-change/cancel')
  async cancelScheduledChange(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    await this.schedulePlanChangeUseCase.cancel(req.user.clinicId);
    return { success: true };
  }
}
