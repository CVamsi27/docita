import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ForbiddenException,
  UsePipes,
} from '@nestjs/common';
import { FeedbackService } from '@/domains/feedback/application/services/feedback.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { RequestWithUser } from '@/common/types/common.types';
import { requireUserRole } from '@/common/utils/request-context.utils';

import {
  CreateFeedbackDto,
  UpdateFeedbackStatusDto,
  FeedbackResponseDto,
  FeedbackListResponseDto,
  CreateFeedbackSchema,
  UpdateFeedbackStatusSchema,
} from '@/domains/feedback/dto/feedback.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

@Controller('feedback')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ZodSerializerDto(FeedbackResponseDto)
  @UsePipes(new ZodValidationPipe(CreateFeedbackSchema))
  create(@Request() req: RequestWithUser, @Body() dto: CreateFeedbackDto) {
    if (!req.user?.id || !req.user?.clinicId) {
      throw new ForbiddenException('User session required');
    }
    return this.feedbackService.create(req.user.clinicId, req.user.id, dto);
  }

  @Get('can-submit')
  async canSubmit(@Request() req: RequestWithUser) {
    if (!req.user?.id || !req.user?.clinicId) {
      throw new ForbiddenException('User session required');
    }
    const hasRecent = await this.feedbackService.hasRecentFeedback(
      req.user.id,
      req.user.clinicId,
    );
    return { canSubmit: !hasRecent };
  }

  @Get('my-feedback')
  @ZodSerializerDto(FeedbackListResponseDto)
  getMyFeedback(@Request() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new ForbiddenException('User session required');
    }
    return this.feedbackService.findByUser(req.user.id);
  }

  @Get('stats')
  getStats(
    @Request() req: RequestWithUser,
    @Query('clinicId') clinicId?: string,
  ) {
    if (!req.user) {
      throw new ForbiddenException('User session required');
    }

    if (req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view feedback statistics');
    }

    if (!req.user.clinicId) {
      throw new ForbiddenException('Clinic ID is required');
    }

    if (clinicId && clinicId !== req.user.clinicId) {
      throw new ForbiddenException('Cannot view stats for another clinic');
    }

    return this.feedbackService.getStats(req.user.clinicId);
  }

  @Get('clinic')
  @ZodSerializerDto(FeedbackListResponseDto)
  findForClinic(@Request() req: RequestWithUser) {
    if (!req.user) throw new ForbiddenException('User session required');
    if (req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view clinic feedback');
    }

    return this.feedbackService.findAllForClinic(req.user.clinicId || '');
  }

  @Get(':id')
  @ZodSerializerDto(FeedbackResponseDto)
  findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.feedbackService.findOne(id, req.user?.clinicId || undefined);
  }

  @Patch(':id/status')
  @ZodSerializerDto(FeedbackResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateFeedbackStatusSchema))
  updateStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    if (requireUserRole(req) !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can update feedback status');
    }

    return this.feedbackService.updateStatus(
      id,
      dto,
      req.user?.clinicId || undefined,
    );
  }

  @Delete(':id')
  delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    if (requireUserRole(req) !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete feedback');
    }

    return this.feedbackService.delete(id, req.user?.clinicId || undefined);
  }
}
