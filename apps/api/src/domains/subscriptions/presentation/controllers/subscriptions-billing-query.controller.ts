import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
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
  SubscriptionBillingPaymentHistoryResponseDto,
  SubscriptionBillingPreviewQueryDto,
} from '@/domains/subscriptions/application/dto/subscriptions-billing.dto';
import {
  APP_ACCESS_TARGETS,
  subscriptionBillingPreviewResponseSchema,
  subscriptionBillingStatusResponseSchema,
} from '@workspace/types';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import {
  mapSubscriptionBillingPayments,
  requireBillingClinicId,
} from '@/domains/subscriptions/presentation/controllers/subscriptions-billing.helpers';

@Controller(['subscriptions', 'subscription'])
@SkipSubscriptionCheck()
@UseGuards(JwtAuthGuard)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
export class SubscriptionsBillingQueryController {
  constructor(
    private readonly queryService: SubscriptionsQueryService,
    private readonly checkoutPricingService: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
  ) {}

  @Get('billing')
  async getBillingStatus(@Request() req: RequestWithUser) {
    const clinicId = requireBillingClinicId(req);
    return subscriptionBillingStatusResponseSchema.parse(
      await this.queryService.getBillingStatus(clinicId),
    );
  }

  @Get('billing/payments')
  @ZodSerializerDto(SubscriptionBillingPaymentHistoryResponseDto)
  async getPaymentHistory(@Request() req: RequestWithUser) {
    const clinicId = requireBillingClinicId(req);
    const payments = await this.queryService.getPaymentHistory(clinicId);
    return mapSubscriptionBillingPayments(
      payments as Parameters<typeof mapSubscriptionBillingPayments>[0],
    );
  }

  @Get('billing/preview')
  async getBillingPreview(
    @Request() req: RequestWithUser,
    @Query() query: SubscriptionBillingPreviewQueryDto,
  ) {
    const clinicId = requireBillingClinicId(req);
    const { tier, cycle } = query;
    const subscriptionEntity =
      await this.queryService.findSubscriptionEntity(clinicId);
    const pricingOffer = await this.queryService.getClinicPricingOffer(clinicId);
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
}
