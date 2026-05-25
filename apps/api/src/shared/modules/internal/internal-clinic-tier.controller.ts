import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ClinicTier } from '@workspace/db';
import { ZodSerializerDto } from 'nestjs-zod';
import { recordInternalAdditionalChargeRequestSchema } from '@workspace/types';
import { InternalAiService } from './internal-ai.service';
import { InternalBillingService } from './internal-billing.service';
import {
  ProcessPaymentDto,
  RecordInternalAdditionalChargeRequestDto,
} from './dto/payment.dto';
import {
  InternalClinicTierInfoResponseDto,
  InternalTierPricingResponseDto,
  InternalAIFeatureCatalogResponseDto,
  SuccessResponseDto,
} from './dto/internal.dto';
import { InternalApiAccess } from './internal.controller.access';

@Controller('internal')
@InternalApiAccess()
export class InternalClinicTierController {
  constructor(
    private readonly billingService: InternalBillingService,
    private readonly aiService: InternalAiService,
  ) {}

  @Post('clinics/:id/process-payment')
  @ZodSerializerDto(SuccessResponseDto)
  async processPaymentAndUpdateTier(
    @Param('id') id: string,
    @Body() data: ProcessPaymentDto,
  ) {
    return this.billingService.processPaymentAndUpdateTier(id, data);
  }

  @Post('clinics/:id/additional-charge')
  async recordAdditionalCharge(
    @Param('id') id: string,
    @Body() data: RecordInternalAdditionalChargeRequestDto,
  ) {
    return this.billingService.recordAdditionalCharge(
      id,
      recordInternalAdditionalChargeRequestSchema.parse(data),
    );
  }

  @Get('clinics/:id/tier-info')
  @ZodSerializerDto(InternalClinicTierInfoResponseDto)
  async getClinicTierInfo(@Param('id') id: string) {
    return this.billingService.getClinicTierInfo(id);
  }

  @Post('clinics/:id/upgrade-tier')
  @ZodSerializerDto(SuccessResponseDto)
  async upgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.billingService.upgradeTier(id, newTier);
  }

  @Post('clinics/:id/downgrade-tier')
  @ZodSerializerDto(SuccessResponseDto)
  async downgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.billingService.downgradeTier(id, newTier);
  }

  @Get('tier-pricing')
  @ZodSerializerDto(InternalTierPricingResponseDto)
  getTierPricingInfo() {
    return this.billingService.getTierPricingInfo();
  }

  @Get('ai-features-catalog')
  @ZodSerializerDto(InternalAIFeatureCatalogResponseDto)
  getAIFeaturesCatalog() {
    return this.aiService.getAIFeaturesCatalog();
  }
}
