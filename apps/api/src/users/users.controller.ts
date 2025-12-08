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

interface AuthRequest {
  user: {
    userId: string;
  };
}

interface UpdateProfileDto {
  name?: string;
  email?: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Request() req: AuthRequest,
    @Body() data: UpdateProfileDto,
  ) {
    if (!req.user?.userId) {
      throw new BadRequestException('User ID not found in token');
    }

    if (!data.name && !data.email) {
      throw new BadRequestException(
        'At least one field (name or email) is required',
      );
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new BadRequestException('Invalid email format');
    }

    return await this.usersService.updateProfile(req.user.userId, data);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
