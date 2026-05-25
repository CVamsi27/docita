import { Module } from '@nestjs/common';
import { FeedbackController } from './presentation/controllers/feedback.controller';
import { FeedbackService } from './application/services/feedback.service';
import { FEEDBACK_REPOSITORY_TOKEN } from './core/repositories/feedback.repository.interface';
import { PrismaFeedbackRepository } from './infrastructure/repositories/prisma-feedback.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    {
      provide: FEEDBACK_REPOSITORY_TOKEN,
      useClass: PrismaFeedbackRepository,
    },
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}
