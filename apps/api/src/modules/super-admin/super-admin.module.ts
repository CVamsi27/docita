import { Module } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService, PrismaService],
})
export class SuperAdminModule {}
