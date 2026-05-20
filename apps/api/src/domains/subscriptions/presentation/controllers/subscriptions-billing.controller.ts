import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  ActivateSubscriptionUseCase,
  CancelSubscriptionUseCase,
  CreateCheckoutUseCase,
  ResumeSubscriptionPaymentUseCase,
  SchedulePlanChangeUseCase,
} from '@/domains/subscriptions/application/use-cases';
import { SubscriptionsQueryService } from '@/domains/subscriptions/application/services/subscriptions-query.service';
import {
  finalizePayableAmountPaise,
  SubscriptionCheckoutPricingService,
} from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  SubscriptionBillingActivateRequestDto,
  SubscriptionBillingCancelRequestDto,
  SubscriptionBillingCheckoutRequestDto,
  SubscriptionBillingPaymentHistoryResponseDto,
  SubscriptionBillingPreviewQueryDto,
  SubscriptionBillingResumePaymentResponseDto,
} from '@/domains/subscriptions/application/dto/subscriptions-billing.dto';
import {
  APP_ACCESS_TARGETS,
  subscriptionBillingActivateResponseSchema,
  subscriptionBillingCancelResponseSchema,
  subscriptionBillingCheckoutResponseSchema,
  subscriptionBillingPreviewResponseSchema,
  subscriptionBillingStatusResponseSchema,
} from '@workspace/types';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';

@Controller(['subscriptions', 'subscription'])
@SkipSubscriptionCheck()
@UseGuards(JwtAuthGuard)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
export class SubscriptionsBillingController {
  constructor(
    private readonly createCheckoutUseCase: CreateCheckoutUseCase,
    private readonly resumeSubscriptionPaymentUseCase: ResumeSubscriptionPaymentUseCase,
    private readonly activateSubscriptionUseCase: ActivateSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly queryService: SubscriptionsQueryService,
    private readonly checkoutPricingService: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
    private readonly schedulePlanChangeUseCase: SchedulePlanChangeUseCase,
  ) {}

  @Get('billing')
  async getBillingStatus(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    return subscriptionBillingStatusResponseSchema.parse(
      await this.queryService.getBillingStatus(req.user.clinicId),
    );
  }

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
      const receiptUrl =
        status === 'paid' && typeof p.invoiceUrl === 'string'
          ? p.invoiceUrl
          : undefined;
      return {
        id: p.id,
        amountCents: p.amountCents,
        amount: p.amountCents / 100,
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

  @Post('billing/schedule-change/cancel')
  async cancelScheduledChange(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) throw new Error('Clinic ID not found');
    await this.schedulePlanChangeUseCase.cancel(req.user.clinicId);
    return { success: true };
  }
}
