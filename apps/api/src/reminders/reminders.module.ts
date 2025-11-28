import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
