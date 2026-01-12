import {
  Controller,
  Put,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { UpdateProfileDto } from './dto/users.dto';

interface AuthRequest {
  user: {
    userId: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Put('profile')
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
