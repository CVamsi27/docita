import { Module } from '@nestjs/common';
import { UsersController } from './presentation/controllers/users.controller';
import { UsersService } from './application/services/users.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserFactory } from './core/factories/user.factory';
import { USER_REPOSITORY_TOKEN } from './core/repositories/user.repository.interface';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserFactory,
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [UsersService, UserFactory],
})
export class UsersModule {}
