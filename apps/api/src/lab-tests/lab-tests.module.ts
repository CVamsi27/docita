import { Module } from '@nestjs/common';
import { LabTestsController } from './lab-tests.controller';
import { LabTestsService } from './lab-tests.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LabTestsController],
  providers: [LabTestsService],
  exports: [LabTestsService],
})
export class LabTestsModule {}
