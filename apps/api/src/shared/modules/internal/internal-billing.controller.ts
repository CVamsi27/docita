import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { InternalBillingService } from './internal-billing.service';
import {
  ExtendGracePeriodRequestDto,
  InternalBillingExpiringQueryDto,
  InternalBillingPaymentsQueryDto,
  InternalBillingSubscriptionsQueryDto,
} from './dto/internal-billing.dto';

@Controller('internal/billing')
@ApiTags('Internal - Billing')
@Roles(Role.INTERNAL)
@ApiBearerAuth()
export class InternalBillingController {
  constructor(private readonly billingService: InternalBillingService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get billing metrics overview' })
  async getMetrics() {
    return this.billingService.getMetrics();
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions with filters' })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'billingCycle', required: false })
  async getSubscriptions(
    @Query() query?: InternalBillingSubscriptionsQueryDto,
  ) {
    return this.billingService.getSubscriptions({
      tier: query?.tier,
      status: query?.status,
      billingCycle: query?.billingCycle,
    });
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get subscriptions expiring soon' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getExpiringSubscriptions(
    @Query() query?: InternalBillingExpiringQueryDto,
  ) {
    return this.billingService.getExpiringSubscriptions(query?.days);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'clinicId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPayments(@Query() query?: InternalBillingPaymentsQueryDto) {
    return this.billingService.getPayments({
      clinicId: query?.clinicId,
      startDate: query?.startDate,
      endDate: query?.endDate,
    });
  }

  @Post('subscriptions/:subscriptionId/remind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send reminder to subscription owner' })
  async sendReminder(@Param('subscriptionId') subscriptionId: string) {
    return this.billingService.sendReminder(subscriptionId);
  }

  @Get('pricing/tiers')
  @ApiOperation({ summary: 'List all tier pricing rows' })
  async getPricingTiers() {
    return this.billingService.getPricingTiers();
  }

  @Put('pricing/tiers/:tierId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a tier pricing row' })
  async updatePricingTier(
    @Param('tierId') tierId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.billingService.updatePricingTier(tierId, dto);
  }

  @Get('pricing/offers')
  @ApiOperation({ summary: 'List all clinic pricing offers' })
  async getPricingOffers() {
    return this.billingService.getPricingOffers();
  }

  @Put('pricing/offers/:clinicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update a clinic pricing offer' })
  async updatePricingOffer(
    @Param('clinicId') clinicId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.billingService.upsertPricingOffer(clinicId, {
      title: String(dto.title ?? ''),
      description: typeof dto.description === 'string' ? dto.description : '',
      percentOff:
        typeof dto.percentOff === 'number'
          ? dto.percentOff
          : Number(dto.percentOff ?? 0),
      validUntil:
        typeof dto.validUntil === 'string' ? dto.validUntil : undefined,
      durationMonths:
        typeof dto.durationMonths === 'number'
          ? dto.durationMonths
          : Number.isFinite(Number(dto.durationMonths))
            ? Number(dto.durationMonths)
            : undefined,
      notes: typeof dto.notes === 'string' ? dto.notes : undefined,
    });
  }

  @Delete('pricing/offers/:clinicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a clinic pricing offer' })
  async deletePricingOffer(@Param('clinicId') clinicId: string) {
    return this.billingService.deletePricingOffer(clinicId);
  }

  @Post('subscriptions/:subscriptionId/extend-grace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend grace period for a subscription' })
  async extendGracePeriod(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: ExtendGracePeriodRequestDto,
  ) {
    return this.billingService.extendGracePeriod(subscriptionId, dto.days);
  }
}
