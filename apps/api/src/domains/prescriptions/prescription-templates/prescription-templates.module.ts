import { Module } from '@nestjs/common';
import { PrescriptionTemplatesController } from './presentation/controllers/prescription-templates.controller';
import { PrescriptionTemplatesService } from './application/services/prescription-templates.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrescriptionTemplatesController],
  providers: [PrescriptionTemplatesService],
  exports: [PrescriptionTemplatesService],
})
export class PrescriptionTemplatesModule {}
