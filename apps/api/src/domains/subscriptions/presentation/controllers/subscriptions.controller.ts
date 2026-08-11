import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  CreateSubscriptionUseCase,
  CancelSubscriptionUseCase,
  CreateCheckoutUseCase,
} from '@/domains/subscriptions/application/use-cases';
import { SubscriptionsQueryService } from '@/domains/subscriptions/application/services/subscriptions-query.service';
import {
  CLINIC_USAGE_PORT_TOKEN,
  type IClinicUsagePort,
} from '@/domains/billing/application/ports';
import { ClinicTier } from '@/domains/subscriptions/core/value-objects';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  SubscriptionActivateLegacyRequestDto,
  SubscriptionCancelRequestDto,
  SubscriptionCheckoutRequestDto,
} from '@/domains/subscriptions/application/dto/subscriptions-controller.dto';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import {
  APP_ACCESS_TARGETS,
  currentUsageSchema,
  subscriptionCurrentResponseSchema,
  SUBSCRIPTION_TRIAL_DAYS,
} from '@workspace/types';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';

@Controller(['subscriptions', 'subscription'])
@SkipSubscriptionCheck()
export class SubscriptionsController {
  constructor(
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly createCheckoutUseCase: CreateCheckoutUseCase,
    private readonly queryService: SubscriptionsQueryService,
    @Inject(CLINIC_USAGE_PORT_TOKEN)
    private readonly clinicUsage: IClinicUsagePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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
    return subscriptionCurrentResponseSchema.parse(
      await this.queryService.getSubscriptionDetails(req.user!.clinicId!),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Get('usage')
  async getCurrentUsage(@Request() req: RequestWithUser) {
    const usage = await this.clinicUsage.getCurrentUsage(req.user!.clinicId!);
    return currentUsageSchema.parse(JSON.parse(JSON.stringify(usage)));
  }

  @UseGuards(JwtAuthGuard)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
  @Post('checkout')
  async createCheckout(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionCheckoutRequestDto,
  ) {
    return this.createCheckoutUseCase.execute({
      clinicId: req.user!.clinicId!,
      tier: body.tier,
      cycle: body.cycle,
      referrals: body.referrals,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancel(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionCancelRequestDto,
  ) {
    return this.cancelSubscriptionUseCase.execute({
      clinicId: req.user!.clinicId!,
      reason: body.reason,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('activate-legacy')
  async activateLegacy(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionActivateLegacyRequestDto,
  ) {
    const normalizedBillingCycle: 'MONTHLY' | 'YEARLY' =
      body.cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

    return this.createSubscriptionUseCase.execute({
      clinicId: req.user!.clinicId!,
      plan: ClinicTier.fromString(body.tier).value,
      billingCycle: normalizedBillingCycle,
      currentPeriodStart: this.clock.now(),
      currentPeriodEnd: new Date(
        this.clock.now().getTime() +
          SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000,
      ),
    });
  }
}
