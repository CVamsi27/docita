import { PrismaService } from '@/prisma/prisma.service';
import type { PrismaClient } from '@workspace/db';

export abstract class PrismaReadBase {
  constructor(protected readonly prisma: PrismaService) {}

  protected getReadClient(): PrismaClient {
    return this.prisma.getReadClient();
  }
}
