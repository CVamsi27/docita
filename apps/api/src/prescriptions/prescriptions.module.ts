import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../modules/whatsapp/whatsapp.module';
import { CommonServicesModule } from '../common/services/common-services.module';

@Module({
  imports: [PrismaModule, WhatsappModule, CommonServicesModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
