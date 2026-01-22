import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonServicesModule } from '../../common/services/common-services.module';
import { PrescriptionEventsListener } from './events/prescription-events.listener';

@Module({
  imports: [PrismaModule, CommonServicesModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionEventsListener],
})
export class PrescriptionsModule {}
