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
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { StaffSelfServiceAccess } from './users.controller.access';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @StaffSelfServiceAccess()
  @Get('profile')
  @ZodSerializerDto(UserResponseDto)
  async getProfile(@Request() req: RequestWithUser) {
    if (!req.user?.id)
      throw new BadRequestException('User ID not found in token');
    const profile = await this.usersService.getProfile(req.user.id);
    if (!profile) throw new BadRequestException('User not found');
    return profile;
  }

  @StaffSelfServiceAccess()
  @Put('profile')
  @ZodSerializerDto(UserResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!req.user?.id)
      throw new BadRequestException('User ID not found in token');

    return await this.usersService.updateProfile(req.user.id, dto);
  }

  @StaffSelfServiceAccess()
  @Post('account/delete-request')
  @ZodSerializerDto(StaffAccountDeletionResponseDto)
  async requestAccountDeletion(
    @Request() req: RequestWithUser,
    @Body(new ZodValidationPipe(StaffAccountDeletionRequestSchema))
    _body: StaffAccountDeletionRequestDto,
  ) {
    if (!req.user?.id)
      throw new BadRequestException('User ID not found in token');

    return await this.usersService.requestAccountDeletion(req.user.id);
  }
}
