import { Module } from '@nestjs/common';
import { IpdService } from './ipd.service';
import { IpdController } from './ipd.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { IpdFactory } from './factories/ipd.factory';

@Module({
  controllers: [IpdController],
  providers: [IpdService, PrismaService, IpdFactory],
  exports: [IpdService, IpdFactory],
})
export class IpdModule {}
