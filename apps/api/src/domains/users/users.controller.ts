import {
  Controller,
  Put,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  UserResponseDto,
  UpdateProfileSchema,
} from './dto/users.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    userId: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.RECEPTIONIST,
    Role.ADMIN_DOCTOR,
    Role.SUPER_ADMIN,
  )
  @Put('profile')
  @ZodSerializerDto(UserResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  async updateProfile(
    @Request() req: AuthRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!req.user?.userId) {
      throw new BadRequestException('User ID not found in token');
    }

    return await this.usersService.updateProfile(req.user.userId, dto);
  }
}
