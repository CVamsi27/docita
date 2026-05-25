import { Module } from '@nestjs/common';
import { PrescriptionTemplatesController } from './presentation/controllers/prescription-templates.controller';
import { PrescriptionTemplatesService } from './application/services/prescription-templates.service';
import { PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN } from './application/ports/prescription-templates.repository.port';
import { PrismaPrescriptionTemplatesRepository } from './infrastructure/repositories/prisma-prescription-templates.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrescriptionTemplatesController],
  providers: [
    PrescriptionTemplatesService,
    {
      provide: PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN,
      useClass: PrismaPrescriptionTemplatesRepository,
    },
  ],
  exports: [PrescriptionTemplatesService],
})
export class PrescriptionTemplatesModule {}
