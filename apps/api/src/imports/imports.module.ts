import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
