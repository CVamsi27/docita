import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserFactory } from './factories/user.factory';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, UserFactory],
  exports: [UsersService, UserFactory],
})
export class UsersModule {}
