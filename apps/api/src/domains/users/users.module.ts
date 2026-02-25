import { Module } from '@nestjs/common';
import { UsersController } from './presentation/controllers/users.controller';
import { UsersService } from './application/services/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserFactory } from './core/factories/user.factory';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, UserFactory],
  exports: [UsersService, UserFactory],
})
export class UsersModule {}
