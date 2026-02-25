import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import { FeedbackService } from '../../application/services/feedback.service';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { RequestWithUser } from '../../../../common/types/common.types';

import {
  CreateFeedbackDto,
  UpdateFeedbackStatusDto,
  FeedbackResponseDto,
  FeedbackListResponseDto,
  CreateFeedbackSchema,
  UpdateFeedbackStatusSchema,
} from '../../dto/feedback.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';

interface FeedbackFiltersQuery {
  status?: string;
  category?: string;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: string;
  maxRating?: string;
  search?: string;
}

@Controller('feedback')
@Roles(
  Role.ADMIN,
  Role.DOCTOR,
  Role.RECEPTIONIST,
  Role.ADMIN_DOCTOR,
  Role.SUPER_ADMIN,
)
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

    if (req.user.role !== Role.SUPER_ADMIN && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view feedback statistics');
    }

    // Non-super admins can only see their clinic's stats
    if (req.user.role !== Role.SUPER_ADMIN) {
      if (!req.user.clinicId) {
        throw new ForbiddenException('Clinic ID is required');
      }
      return this.feedbackService.getStats(req.user.clinicId);
    }

    if (!clinicId) {
      throw new BadRequestException('clinicId is required for super admins');
    }

    return this.feedbackService.getStats(clinicId);
  }

  @Get('all')
  @ZodSerializerDto(FeedbackListResponseDto)
  findAll(
    @Request() req: RequestWithUser,
    @Query() query: FeedbackFiltersQuery,
  ) {
    if (!req.user) {
      throw new ForbiddenException('User session required');
    }
    // Only super admin can see all feedback
    if (req.user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can view all feedback');
    }

    return this.feedbackService.findAll({
      status: query.status,
      category: query.category,
      clinicId: query.clinicId,
      startDate: query.startDate,
      endDate: query.endDate,
      minRating: query.minRating ? parseInt(query.minRating) : undefined,
      maxRating: query.maxRating ? parseInt(query.maxRating) : undefined,
      search: query.search,
    });
  }

  @Get('clinic')
  @ZodSerializerDto(FeedbackListResponseDto)
  findForClinic(@Request() req: RequestWithUser) {
    if (!req.user) throw new ForbiddenException('User session required');
    if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can view clinic feedback');
    }

    return this.feedbackService.findAllForClinic(req.user.clinicId || '');
  }

  @Get(':id')
  @ZodSerializerDto(FeedbackResponseDto)
  findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.feedbackService.findOne(id, req.user?.clinicId || undefined);
  }

  /**
   * Update feedback status (admin only)
   */
  @Patch(':id/status')
  @ZodSerializerDto(FeedbackResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateFeedbackStatusSchema))
  updateStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can update feedback status');
    }

    return this.feedbackService.updateStatus(id, dto);
  }

  /**
   * Delete feedback (super admin only)
   */
  @Delete(':id')
  delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    if (req.user!.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can delete feedback');
    }

    return this.feedbackService.delete(id);
  }
}
