import { Module } from '@nestjs/common';
import { MedicalCodingController } from './medical-coding.controller';
import { MedicalCodingService } from './medical-coding.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MedicalCodingController],
  providers: [MedicalCodingService],
  exports: [MedicalCodingService],
})
export class MedicalCodingModule {}
