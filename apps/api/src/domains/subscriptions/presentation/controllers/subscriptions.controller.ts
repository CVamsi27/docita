/**
 * Subscriptions Controller
 * HTTP API endpoints for subscription management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateSubscriptionDto,
  UpgradeSubscriptionDto,
  CancelSubscriptionDto,
  validateCreateSubscription,
  validateUpgradeSubscription,
  validateCancelSubscription,
  SubscriptionResponseDto,
} from '../../application/dto/subscription.dto';
import {
  CreateSubscriptionUseCase,
  UpgradeSubscriptionUseCase,
  CancelSubscriptionUseCase,
} from '../../application/use-cases';
import { ISubscriptionRepository } from '../../application/ports';
import { SubscriptionMapper } from '../../infrastructure/mappers';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private createSubscriptionUseCase: CreateSubscriptionUseCase,
    private upgradeSubscriptionUseCase: UpgradeSubscriptionUseCase,
    private cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private subscriptionRepository: ISubscriptionRepository,
  ) {}

  /**
   * Create new subscription
   * POST /subscriptions
   */
  @Post()
  async create(@Body() body: any) {
    try {
      const dto = validateCreateSubscription(body);
      const result = await this.createSubscriptionUseCase.execute(dto);
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to create subscription',
      );
    }
  }

  /**
   * Get subscription details
   * GET /subscriptions/:id
   */
  @Get(':id')
  async getSubscription(@Param('id') id: string) {
    try {
      const subscription = await this.subscriptionRepository.findById(id);

      if (!subscription) {
        throw new BadRequestException(`Subscription ${id} not found`);
      }

      return {
        statusCode: HttpStatus.OK,
        data: this.toResponseDto(subscription),
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to fetch subscription',
      );
    }
  }

  /**
   * Get clinic subscription
   * GET /subscriptions/clinic/:clinicId
   */
  @Get('clinic/:clinicId')
  async getClinicSubscription(@Param('clinicId') clinicId: string) {
    try {
      const subscription =
        await this.subscriptionRepository.findByClinicId(clinicId);

      if (!subscription) {
        throw new BadRequestException(
          `No subscription found for clinic ${clinicId}`,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        data: this.toResponseDto(subscription),
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to fetch subscription',
      );
    }
  }

  /**
   * Upgrade subscription
   * PATCH /subscriptions/:id/upgrade
   */
  @Patch(':id/upgrade')
  async upgrade(@Param('id') id: string, @Body() body: any) {
    try {
      const dto = validateUpgradeSubscription({ subscriptionId: id, ...body });
      const result = await this.upgradeSubscriptionUseCase.execute(dto);

      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to upgrade subscription',
      );
    }
  }

  /**
   * Cancel subscription
   * DELETE /subscriptions/:id
   */
  @Delete(':id')
  async cancel(@Param('id') id: string, @Body() body: any) {
    try {
      const dto = validateCancelSubscription({ subscriptionId: id, ...body });
      const result = await this.cancelSubscriptionUseCase.execute(dto);

      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to cancel subscription',
      );
    }
  }

  /**
   * Convert domain entity to response DTO
   */
  private toResponseDto(subscription: any): SubscriptionResponseDto {
    return {
      id: subscription.id,
      clinicId: subscription.clinicId,
      plan: subscription.getPlan().toString(),
      billingCycle: subscription.getBillingCycle().toString(),
      status: subscription.getStatus().toString(),
      basePriceCents: subscription.getBasePrice().paise,
      totalDiscountPercent: subscription.getDiscounts().getTotalPercent(),
      creditsCents: subscription.getCredits().paise,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      trialEnd: subscription.trialEnd?.toISOString(),
      autoPayEnabled: subscription.isAutoPayEnabled(),
      cancelledAt: (subscription as any).cancelledAt?.toISOString(),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }
}
