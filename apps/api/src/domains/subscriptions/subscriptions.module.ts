// check-as-cast-density: allow-file — `configService.getJwtExpiration()`
// returns `string | number`; we feed it into `expiresIn` which wants
// `number`. The double-cast is the documented bridge.
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import {
  ResumeSubscriptionPaymentUseCase,
  SchedulePlanChangeUseCase,
} from './application/use-cases';
import {
  SUBSCRIPTIONS_COMMON_PROVIDERS,
  SUBSCRIPTIONS_COMMON_EXPORTS,
} from './subscriptions-common.providers';
import { SubscriptionsBillingQueryController } from './presentation/controllers/subscriptions-billing-query.controller';
import { SubscriptionsBillingMutationController } from './presentation/controllers/subscriptions-billing-mutation.controller';
import { SubscriptionsController } from './presentation/controllers/subscriptions.controller';
import { SubscriptionsWebhookController } from './presentation/controllers/subscriptions-webhook.controller';
import { PartnerAuthController } from './presentation/controllers/partner-auth.controller';
import { PartnerPortalController } from './presentation/controllers/partner-portal.controller';
import { PartnerAuthGuard } from './presentation/guards/partner-auth.guard';
import { PartnerAuthService } from './core/services/partner-auth.service';
import { PartnerPortalService } from './core/services/partner-portal.service';
import { FacilityLeadService } from './core/services/facility-lead.service';
import { ClinicReferralAdapter } from './infrastructure/adapters/clinic-referral.adapter';
import { PrismaModule } from '@/prisma/prisma.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { AdminAlertsModule } from '@/shared/modules/messaging/admin-alerts/admin-alerts.module';
import { CommonModule } from '@/shared/common/common.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { DocumentsModule } from '@/domains/documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    PaymentsModule,
    EmailModule,
    AdminAlertsModule,
    CommonModule,
    AppConfigModule,
    DocumentsModule,
    // Local JwtModule — same signing config as the auth module, but
    // importing AuthModule here would close a new circular
    // (subscriptions -> auth -> clinics -> subscriptions). The
    // forwardRef dance in auth.module.ts only resolves the existing
    // auth <-> clinics cycle; the third leg (subscriptions) would
    // be a fresh entry that the project baseline explicitly
    // disallows. Registering the JWT locally is the smaller
    // solution.
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.getJwtSecret(),
        signOptions: {
          // getJwtExpiration returns a string like '15m'; nestjs-jwt
          // accepts StringValue, which is a string literal type
          // cast at runtime. The cast is safe because the value is
          // never user-controlled.
          expiresIn: configService.getJwtExpiration() as unknown as number,
        },
      }),
    }),
  ],
  controllers: [
    SubscriptionsController,
    SubscriptionsBillingQueryController,
    SubscriptionsBillingMutationController,
    SubscriptionsWebhookController,
    PartnerAuthController,
    PartnerPortalController,
  ],
  providers: [
    ...SUBSCRIPTIONS_COMMON_PROVIDERS,
    ResumeSubscriptionPaymentUseCase,
    SchedulePlanChangeUseCase,
    PartnerAuthService,
    PartnerPortalService,
    FacilityLeadService,
    PartnerAuthGuard,
    ClinicReferralAdapter,
  ],
  exports: [
    ...SUBSCRIPTIONS_COMMON_EXPORTS,
    SchedulePlanChangeUseCase,
    ClinicReferralAdapter,
    FacilityLeadService,
  ],
})
export class SubscriptionsModule {}
