import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Request,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from '@/domains/users/application/services/users.service';
import {
  StaffAccountDeletionRequestDto,
  StaffAccountDeletionResponseDto,
  StaffAccountDeletionRequestSchema,
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
  @Roles(
    Role.ADMIN,
    Role.ADMIN_DOCTOR,
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
  )
  @Get('profile')
  @ZodSerializerDto(UserResponseDto)
  async getProfile(@Request() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in token');
    }
    const profile = await this.usersService.getProfile(req.user.id);
    if (!profile) {
      throw new BadRequestException('User not found');
    }
    return profile;
  }

  @SkipSubscriptionCheck()
  @Roles(
    Role.ADMIN,
    Role.ADMIN_DOCTOR,
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
  )
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

  @SkipSubscriptionCheck()
  @Roles(
    Role.ADMIN,
    Role.ADMIN_DOCTOR,
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
  )
  @Post('account/delete-request')
  @ZodSerializerDto(StaffAccountDeletionResponseDto)
  async requestAccountDeletion(
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(StaffAccountDeletionRequestSchema))
    _body: StaffAccountDeletionRequestDto,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in token');
    }

    return await this.usersService.requestAccountDeletion(req.user.id);
  }
}
