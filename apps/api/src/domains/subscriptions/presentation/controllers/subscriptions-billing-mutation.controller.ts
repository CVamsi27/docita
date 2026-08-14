import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
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
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  SubscriptionBillingActivateRequestDto,
  SubscriptionBillingCancelRequestDto,
  SubscriptionBillingCheckoutRequestDto,
  SubscriptionBillingResumePaymentResponseDto,
} from '@/domains/subscriptions/application/dto/subscriptions-billing.dto';
import {
  APP_ACCESS_TARGETS,
  subscriptionBillingActivateResponseSchema,
  subscriptionBillingCancelResponseSchema,
  subscriptionBillingCheckoutResponseSchema,
  subscriptionBillingScheduleChangeRequestSchema,
} from '@workspace/types';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { requireBillingClinicId } from '@/domains/subscriptions/presentation/controllers/subscriptions-billing.helpers';

@Controller(['subscriptions', 'subscription'])
@SkipSubscriptionCheck()
@UseGuards(JwtAuthGuard)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING))
export class SubscriptionsBillingMutationController {
  constructor(
    private readonly createCheckoutUseCase: CreateCheckoutUseCase,
    private readonly resumeSubscriptionPaymentUseCase: ResumeSubscriptionPaymentUseCase,
    private readonly activateSubscriptionUseCase: ActivateSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly schedulePlanChangeUseCase: SchedulePlanChangeUseCase,
  ) {}

  @Post('billing/payments/:id/resume')
  @ZodSerializerDto(SubscriptionBillingResumePaymentResponseDto)
  async resumePayment(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const clinicId = requireBillingClinicId(req);
    return this.resumeSubscriptionPaymentUseCase.execute({
      clinicId,
      paymentId: id,
    });
  }

  @Post('billing/checkout')
  async billingCheckout(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionBillingCheckoutRequestDto,
  ) {
    const clinicId = requireBillingClinicId(req);
    try {
      return subscriptionBillingCheckoutResponseSchema.parse(
        await this.createCheckoutUseCase.execute({
          clinicId,
          tier: body.tier,
          cycle: body.billingCycle,
          planMode: body.planMode,
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
    const clinicId = requireBillingClinicId(req);
    await this.activateSubscriptionUseCase.execute({
      clinicId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpayOrderId: body.razorpayOrderId,
      razorpaySignature: body.razorpaySignature,
      tier: body.tier,
      cycle: body.billingCycle,
      planMode: body.planMode,
    });
    return subscriptionBillingActivateResponseSchema.parse({ success: true });
  }

  @Post('billing/cancel')
  async billingCancel(
    @Request() req: RequestWithUser,
    @Body() body: SubscriptionBillingCancelRequestDto,
  ) {
    const clinicId = requireBillingClinicId(req);
    await this.cancelSubscriptionUseCase.execute({
      clinicId,
      cancelAtPeriodEnd: !body.immediate,
    });
    return subscriptionBillingCancelResponseSchema.parse({ success: true });
  }

  @Post('billing/schedule-change')
  async scheduleChange(
    @Request() req: RequestWithUser,
    @Body() rawBody: unknown,
  ) {
    const parsed =
      subscriptionBillingScheduleChangeRequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const body = parsed.data;
    const clinicId = requireBillingClinicId(req);
    return this.schedulePlanChangeUseCase.execute({
      clinicId,
      tier: body.tier,
      cycle: body.billingCycle,
      planMode: body.planMode,
    });
  }

  @Post('billing/schedule-change/cancel')
  async cancelScheduledChange(@Request() req: RequestWithUser) {
    const clinicId = requireBillingClinicId(req);
    await this.schedulePlanChangeUseCase.cancel(clinicId);
    return { success: true };
  }
}
