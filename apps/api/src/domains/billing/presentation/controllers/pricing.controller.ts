import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PricingService } from '@/domains/billing/core/services/pricing.service';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import {
  PricingConfigQueryDto,
  PricingEstimateQueryDto,
} from '@/domains/billing/application/dto/pricing.dto';
import {
  pricingConfigResponseSchema,
  pricingEstimateResponseSchema,
} from '@workspace/types';

@ApiTags('pricing')
@Controller('pricing')
@Public()
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get pricing configuration' })
  @ApiResponse({ status: 200, description: 'Pricing configuration' })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'ZAR'],
  })
  async getPricingConfig(@Query() query?: PricingConfigQueryDto) {
    return pricingConfigResponseSchema.parse(
      await this.pricingService.getPricingConfig(query?.currency),
    );
  }

  @Get('estimate')
  @ApiOperation({ summary: 'Calculate price estimate' })
  @ApiQuery({
    name: 'tier',
    required: true,
    description:
      'Tier ID (STARTER, FRONT_DESK, ESSENTIAL, PROFESSIONAL, HOSPITAL, ENTERPRISE)',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'ZAR'],
  })
  @ApiQuery({
    name: 'billingCycle',
    required: false,
    description: 'monthly or yearly',
  })
  @ApiQuery({
    name: 'consultations',
    required: false,
    description: 'Expected completed consultations per month',
  })
  @ApiQuery({
    name: 'appointments',
    required: false,
    description: 'Legacy alias for consultations',
  })
  @ApiQuery({ name: 'users', required: false, description: 'Number of users' })
  @ApiQuery({
    name: 'whatsapp',
    required: false,
    description:
      'Legacy flag (ignored for paid tiers; WhatsApp workflow is included by default)',
  })
  @ApiQuery({
    name: 'whatsappMessages',
    required: false,
    description: 'Expected WhatsApp messages per month for overage estimate',
  })
  @ApiResponse({
    status: 200,
    description:
      'Price estimate with billable meters: consultations, users, WhatsApp messages',
  })
  calculateEstimate(@Query() query: PricingEstimateQueryDto) {
    const result = this.pricingService.calculateEstimate({
      tier: query.tier,
      currency: query.currency,
      billingCycle: query.billingCycle || 'monthly',
      consultations: query.consultations,
      appointments: query.appointments,
      users: query.users,
      whatsappMessages: query.whatsappMessages,
    });
    if ('breakdown' in result) {
      return pricingEstimateResponseSchema.parse(result);
    }
    return result;
  }
}
