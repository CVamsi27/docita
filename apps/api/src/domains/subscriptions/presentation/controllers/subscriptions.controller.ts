import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import {
  CreateSubscriptionUseCase,
  UpgradeSubscriptionUseCase,
  CancelSubscriptionUseCase,
  CreateCheckoutUseCase,
  ProcessWebhookUseCase,
} from '@/domains/subscriptions/application/use-cases';
import { SubscriptionsQueryService } from '@/domains/subscriptions/application/services/subscriptions-query.service';
import { ClinicTierEnum } from '@/domains/subscriptions/core/value-objects/clinic-tier.value-object';
import { BillingCycleEnum } from '@/domains/subscriptions/core/value-objects/billing-cycle.value-object';
import { RequestWithUser } from '@/common/types/common.types';
import {
  SubscriptionActivateLegacyRequestDto,
  SubscriptionCancelRequestDto,
  SubscriptionCheckoutRequestDto,
} from '@/domains/subscriptions/application/dto/subscriptions-controller.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly upgradeSubscriptionUseCase: UpgradeSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly createCheckoutUseCase: CreateCheckoutUseCase,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    private readonly queryService: SubscriptionsQueryService,
  ) {}

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
}
