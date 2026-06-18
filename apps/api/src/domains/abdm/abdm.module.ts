import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { FhirModule } from '@/shared/modules/fhir/fhir.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { WebhooksModule } from '@/shared/modules/webhooks';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { ABDM_REPOSITORY_TOKEN } from '@/domains/abdm/core/repositories/abdm.repository.interface';
import { PrismaAbdmRepository } from '@/domains/abdm/infrastructure/repositories/prisma-abdm.repository';
import { AbdmGatewayClient } from '@/domains/abdm/infrastructure/abdm-gateway.client';
import { AbdmAbhaClient } from '@/domains/abdm/infrastructure/abdm-abha.client';
import { AbdmExchangeService } from '@/domains/abdm/application/services/abdm-exchange.service';
import { AbdmQueryService } from '@/domains/abdm/application/services/abdm-query.service';
import { AbdmCommandService } from '@/domains/abdm/application/services/abdm-command.service';
import { AbdmCallbackCommandService } from '@/domains/abdm/application/services/abdm-callback-command.service';
import { AbdmCallbackStateService } from '@/domains/abdm/application/services/abdm-callback-state.service';
import {
  AbdmController,
  AbdmGatewayCallbackController,
} from '@/domains/abdm/presentation/controllers/abdm.controller';

@Module({
  imports: [
    PrismaModule,
    FhirModule,
    AppConfigModule,
    WebhooksModule,
    CommonServicesModule,
  ],
  controllers: [AbdmController, AbdmGatewayCallbackController],
  providers: [
    AbdmExchangeService,
    AbdmQueryService,
    AbdmCommandService,
    AbdmCallbackCommandService,
    AbdmCallbackStateService,
    AbdmGatewayClient,
    AbdmAbhaClient,
    PrismaAbdmRepository,
    {
      provide: ABDM_REPOSITORY_TOKEN,
      useExisting: PrismaAbdmRepository,
    },
  ],
  exports: [AbdmExchangeService, AbdmGatewayClient, AbdmAbhaClient],
})
export class AbdmModule {}
