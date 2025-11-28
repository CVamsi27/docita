import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
