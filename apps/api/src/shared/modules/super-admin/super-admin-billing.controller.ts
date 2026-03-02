import {
  Controller,
  Get,
  Post,
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

import { SuperAdminBillingService } from './super-admin-billing.service';
import {
  ExtendGracePeriodRequestDto,
  SuperAdminBillingExpiringQueryDto,
  SuperAdminBillingPaymentsQueryDto,
  SuperAdminBillingSubscriptionsQueryDto,
} from './dto/super-admin-billing.dto';

@Controller('super-admin/billing')
@ApiTags('Super Admin - Billing')
@Roles(Role.SUPER_ADMIN)
@ApiBearerAuth()
export class SuperAdminBillingController {
  constructor(private readonly billingService: SuperAdminBillingService) {}

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
    @Query() query?: SuperAdminBillingSubscriptionsQueryDto,
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
    @Query() query?: SuperAdminBillingExpiringQueryDto,
  ) {
    return this.billingService.getExpiringSubscriptions(query?.days);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'clinicId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPayments(@Query() query?: SuperAdminBillingPaymentsQueryDto) {
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
