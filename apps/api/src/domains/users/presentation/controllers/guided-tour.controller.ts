import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UsePipes,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { GuidedTourService } from '@/domains/users/application/services/guided-tour.service';
import {
  GuidedTourStateDto,
  UpdateGuidedTourDto,
  UpdateGuidedTourSchema,
} from '@/domains/users/application/dto/guided-tour.dto';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { StaffSelfServiceAccess } from './users.controller.access';

@Controller('users')
export class GuidedTourController {
  constructor(private readonly guidedTourService: GuidedTourService) {}

  @StaffSelfServiceAccess()
  @Get('guided-tour')
  @ZodSerializerDto(GuidedTourStateDto)
  async getGuidedTour(@Request() req: RequestWithUser) {
    if (!req.user?.id)
      throw new BadRequestException('User ID not found in token');
    return this.guidedTourService.getGuidedTour(req.user.id);
  }

  @StaffSelfServiceAccess()
  @Patch('guided-tour')
  @ZodSerializerDto(GuidedTourStateDto)
  @UsePipes(new ZodValidationPipe(UpdateGuidedTourSchema))
  async updateGuidedTour(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateGuidedTourDto,
  ) {
    if (!req.user?.id)
      throw new BadRequestException('User ID not found in token');
    return this.guidedTourService.updateGuidedTour(req.user.id, dto);
  }
}
