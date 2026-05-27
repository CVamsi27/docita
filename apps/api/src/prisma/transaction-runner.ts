import { Injectable } from '@nestjs/common';
import type { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { ITransactionRunner } from '@/shared/common/ports/transaction-runner.port';

@Injectable()
export class PrismaTransactionRunner implements ITransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  async runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
