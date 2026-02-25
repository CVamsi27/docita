import { Module } from '@nestjs/common';
import { CustomFieldsController } from './presentation/controllers/custom-fields.controller';
import { CustomFieldsService } from './application/services/custom-fields.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
