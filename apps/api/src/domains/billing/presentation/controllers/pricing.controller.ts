import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PricingService } from '@/domains/billing/core/services/pricing.service';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import {
  PricingConfigQueryDto,
  PricingEstimateQueryDto,
} from '@/domains/billing/application/dto/pricing.dto';

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
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD'],
  })
  async getPricingConfig(@Query() query?: PricingConfigQueryDto) {
    return await this.pricingService.getPricingConfig(query?.currency);
  }

  @Get('estimate')
  @ApiOperation({ summary: 'Calculate price estimate' })
  @ApiQuery({
    name: 'tier',
    required: true,
    description: 'Tier ID (CAPTURE, CORE, PLUS, PRO, ENTERPRISE)',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD'],
  })
  @ApiQuery({
    name: 'billingCycle',
    required: false,
    description: 'monthly, quarterly, semi_annual, or yearly',
  })
  @ApiQuery({
    name: 'patients',
    required: false,
    description: 'Expected active patients',
  })
  @ApiQuery({
    name: 'appointments',
    required: false,
    description: 'Expected appointments per month',
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
  @ApiQuery({
    name: 'intelligence',
    required: false,
    description: 'Include AI features in the estimate (true/false)',
  })
  @ApiQuery({
    name: 'aiCredits',
    required: false,
    description: 'Expected AI credits per month',
  })
  @ApiResponse({ status: 200, description: 'Price estimate' })
  calculateEstimate(@Query() query: PricingEstimateQueryDto) {
    return this.pricingService.calculateEstimate({
      tier: query.tier,
      currency: query.currency,
      billingCycle: query.billingCycle || 'monthly',
      patients: query.patients,
      appointments: query.appointments,
      users: query.users,
      whatsappMessages: query.whatsappMessages,
      intelligence: query.intelligence === 'true',
      aiCredits: query.aiCredits,
    });
  }
}
