import {
  Controller,
  Put,
  Body,
  Request,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from '@/domains/users/application/services/users.service';
import {
  UpdateProfileDto,
  UserResponseDto,
  UpdateProfileSchema,
} from '@/domains/users/application/dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { RequestWithUser } from '@/common/types/common.types';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @SkipSubscriptionCheck()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @Put('profile')
  @ZodSerializerDto(UserResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in token');
    }

    return await this.usersService.updateProfile(req.user.id, dto);
  }
}
