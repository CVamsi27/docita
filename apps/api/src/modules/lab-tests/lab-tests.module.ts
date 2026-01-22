import { Module } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { LabTestsController } from './lab-tests.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { LabFactory } from './factories/lab.factory';

@Module({
  controllers: [LabTestsController],
  providers: [LabTestsService, PrismaService, LabFactory],
  exports: [LabTestsService, LabFactory],
})
export class LabTestsModule {}
