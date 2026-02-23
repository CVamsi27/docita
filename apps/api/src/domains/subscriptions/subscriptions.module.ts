/**
 * Subscriptions Module
 * Wires all layers of the Subscriptions domain with dependency injection
 */

import { Module } from '@nestjs/common';

// Core layer
import {
  SubscriptionPricingService,
  ProratingService,
  SubscriptionValidationService,
} from './core/services';

// Application layer
import {
  CreateSubscriptionUseCase,
  UpgradeSubscriptionUseCase,
  CancelSubscriptionUseCase,
} from './application/use-cases';
import { SUBSCRIPTION_REPOSITORY_TOKEN, PAYMENT_GATEWAY_TOKEN } from './application/ports';

// Infrastructure layer
import { PrismaSubscriptionRepository } from './infrastructure/repositories';

// Presentation layer
import { SubscriptionsController } from './presentation/controllers/subscriptions.controller';

// Dependencies
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [
    // ============================================
    // CORE LAYER (Pure domain logic)
    // ============================================
    SubscriptionPricingService,
    ProratingService,
    SubscriptionValidationService,

    // ============================================
    // APPLICATION LAYER (Use cases & Orchestration)
    // ============================================
    CreateSubscriptionUseCase,
    UpgradeSubscriptionUseCase,
    CancelSubscriptionUseCase,

    // ============================================
    // INFRASTRUCTURE LAYER (Implementations)
    // ============================================
    // Repository implementation
    {
      provide: SUBSCRIPTION_REPOSITORY_TOKEN,
      useClass: PrismaSubscriptionRepository,
    },

    // NOTE: PaymentGateway implementation would be injected here
    // For now, it's a placeholder. Actual implementation would use Razorpay
    // {
    //   provide: PAYMENT_GATEWAY_TOKEN,
    //   useClass: RazorpayPaymentGateway,
    // },
  ],
  exports: [
    // Export use cases for other modules
    CreateSubscriptionUseCase,
    UpgradeSubscriptionUseCase,
    CancelSubscriptionUseCase,
    // Export domain services
    SubscriptionPricingService,
    SubscriptionValidationService,
  ],
})
export class SubscriptionsModule {}
