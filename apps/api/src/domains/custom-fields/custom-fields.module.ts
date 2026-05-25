import { Module } from '@nestjs/common';
import { CustomFieldsController } from './presentation/controllers/custom-fields.controller';
import { CustomFieldsService } from './application/services/custom-fields.service';
import { CUSTOM_FIELDS_REPOSITORY_TOKEN } from './application/ports/custom-fields.repository.port';
import { PrismaCustomFieldsRepository } from './infrastructure/repositories/prisma-custom-fields.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomFieldsController],
  providers: [
    CustomFieldsService,
    {
      provide: CUSTOM_FIELDS_REPOSITORY_TOKEN,
      useClass: PrismaCustomFieldsRepository,
    },
  ],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
