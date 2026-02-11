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
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';

import {
  CreateFeedbackDto,
  UpdateFeedbackStatusDto,
  FeedbackResponseDto,
  FeedbackListResponseDto,
} from './dto/feedback.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
    userId: string;
    role: string;
  };
}

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

  /**
   * Submit feedback
   */
  @Post()
  @ZodSerializerDto(FeedbackResponseDto)
  create(@Request() req: AuthRequest, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.clinicId, req.user.userId, dto);
  }

  /**
   * Check if user can submit feedback (hasn't submitted in last 30 days)
   */
  @Get('can-submit')
  async canSubmit(@Request() req: AuthRequest) {
    const hasRecent = await this.feedbackService.hasRecentFeedback(
      req.user.userId,
      req.user.clinicId,
    );
    return { canSubmit: !hasRecent };
  }

  /**
   * Get user's own feedback history
   */
  @Get('my-feedback')
  @ZodSerializerDto(FeedbackListResponseDto)
  getMyFeedback(@Request() req: AuthRequest) {
    return this.feedbackService.findByUser(req.user.userId);
  }

  /**
   * Get feedback statistics (super admin only)
   */
  @Get('stats')
  getStats(@Request() req: AuthRequest, @Query('clinicId') clinicId?: string) {
    // Only super admin can see all stats
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can view feedback statistics');
    }

    // Non-super admins can only see their clinic's stats
    if (req.user.role !== 'SUPER_ADMIN') {
      return this.feedbackService.getStats(req.user.clinicId);
    }

    return this.feedbackService.getStats(clinicId);
  }

  /**
   * Get all feedback (super admin only)
   */
  @Get('all')
  @ZodSerializerDto(FeedbackListResponseDto)
  findAll(@Request() req: AuthRequest, @Query() query: FeedbackFiltersQuery) {
    // Only super admin can see all feedback
    if (req.user.role !== 'SUPER_ADMIN') {
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

  /**
   * Get feedback for current clinic (admin only)
   */
  @Get('clinic')
  @ZodSerializerDto(FeedbackListResponseDto)
  findForClinic(@Request() req: AuthRequest) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admins can view clinic feedback');
    }

    return this.feedbackService.findAllForClinic(req.user.clinicId);
  }

  /**
   * Get single feedback by ID
   */
  @Get(':id')
  @ZodSerializerDto(FeedbackResponseDto)
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  /**
   * Update feedback status (admin only)
   */
  @Patch(':id/status')
  @ZodSerializerDto(FeedbackResponseDto)
  updateStatus(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admins can update feedback status');
    }

    return this.feedbackService.updateStatus(id, dto);
  }

  /**
   * Delete feedback (super admin only)
   */
  @Delete(':id')
  delete(@Request() req: AuthRequest, @Param('id') id: string) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can delete feedback');
    }

    return this.feedbackService.delete(id);
  }
}
