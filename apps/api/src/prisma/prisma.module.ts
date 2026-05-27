import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaTransactionRunner } from './transaction-runner';
import { CommonModule } from '@/shared/common/common.module';
import { TRANSACTION_RUNNER_PORT } from '@/shared/common/ports/transaction-runner.port';

@Global()
@Module({
  imports: [CommonModule],
  providers: [
    PrismaService,
    PrismaTransactionRunner,
    {
      provide: TRANSACTION_RUNNER_PORT,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [PrismaService, TRANSACTION_RUNNER_PORT],
})
export class PrismaModule {}
