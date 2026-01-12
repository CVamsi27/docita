import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SupportedCurrency } from '@workspace/types';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  /**
   * Get complete pricing configuration
   * Used by landing page to display pricing
   */
  @Get('config')
  @ApiOperation({ summary: 'Get pricing configuration' })
  @ApiResponse({ status: 200, description: 'Pricing configuration' })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD'],
  })
  async getPricingConfig(@Query('currency') currency?: string) {
    return this.pricingService.getPricingConfig(currency);
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
    description: 'Include WhatsApp add-on (true/false)',
  })
  @ApiQuery({
    name: 'whatsappMessages',
    required: false,
    description: 'Expected WhatsApp messages per month',
  })
  @ApiQuery({
    name: 'intelligence',
    required: false,
    description: 'Include Intelligence add-on (true/false)',
  })
  @ApiQuery({
    name: 'aiCredits',
    required: false,
    description: 'Expected AI credits per month',
  })
  @ApiResponse({ status: 200, description: 'Price estimate' })
  calculateEstimate(
    @Query('tier') tier: string,
    @Query('currency') currency?: string,
    @Query('billingCycle') billingCycle: string = 'monthly',
    @Query('patients') patients?: string,
    @Query('appointments') appointments?: string,
    @Query('users') users?: string,
    @Query('whatsapp') whatsapp?: string,
    @Query('whatsappMessages') whatsappMessages?: string,
    @Query('intelligence') intelligence?: string,
    @Query('aiCredits') aiCredits?: string,
  ) {
    return this.pricingService.calculateEstimate({
      tier,
      currency,
      billingCycle,
      patients,
      appointments,
      users,
      whatsapp,
      whatsappMessages,
      intelligence,
      aiCredits,
    });
  }
}
