import { Module } from '@nestjs/common';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
