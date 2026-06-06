import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { FeedbackService } from '@/domains/feedback/application/services/feedback.service';
import {
  parseFeedbackCategoryFilter,
  parseFeedbackStatusFilter,
} from '@/domains/feedback/application/services/feedback-enum-parse';
import { ContactService } from '@/shared/modules/contact/contact.service';
import {
  SupportWhatsAppInboxService,
  SupportWhatsAppMessageListResponseDto,
  SupportWhatsAppReadResponseDto,
  SupportWhatsAppReplyDto,
  SupportWhatsAppReplyResponseDto,
  SupportWhatsAppThreadListResponseDto,
  SupportWhatsAppThreadMessagesQueryDto,
  SupportWhatsAppThreadsQueryDto,
} from '@/shared/modules/support-whatsapp';
import {
  CreateWhatsAppBroadcastDto,
  WhatsAppBroadcastJobDetailDto,
  WhatsAppBroadcastJobListResponseDto,
  WhatsAppBroadcastJobSummaryDto,
  WhatsAppBroadcastService,
} from '@/shared/modules/whatsapp-broadcast';
import {
  FeedbackListResponseDto,
  FeedbackResponseDto,
  UpdateFeedbackStatusDto,
  UpdateFeedbackStatusSchema,
} from '@/domains/feedback/application/dto/feedback.dto';
import { ContactInquiryListResponseDto } from '@/shared/modules/contact/dto/contact.dto';
import { InternalApiAccess } from './internal.controller.access';

@Controller('internal')
@InternalApiAccess()
export class InternalSupportController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly contactService: ContactService,
    private readonly supportWhatsAppInboxService: SupportWhatsAppInboxService,
    private readonly whatsAppBroadcastService: WhatsAppBroadcastService,
  ) {}

  @Get('feedback/all')
  @ZodSerializerDto(FeedbackListResponseDto)
  async getAllFeedback(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('clinicId') clinicId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('search') search?: string,
  ) {
    return this.feedbackService.findAll({
      status: parseFeedbackStatusFilter(status),
      category: parseFeedbackCategoryFilter(category),
      clinicId,
      startDate,
      endDate,
      minRating: parsePaginationInt(minRating, { min: 1, max: 5 }),
      maxRating: parsePaginationInt(maxRating, { min: 1, max: 5 }),
      search,
    });
  }

  @Get('feedback/stats')
  async getFeedbackStats(@Query('clinicId') clinicId?: string) {
    return this.feedbackService.getStats(clinicId);
  }

  @Get('feedback/:id')
  @ZodSerializerDto(FeedbackResponseDto)
  async getFeedbackById(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Patch('feedback/:id/status')
  @ZodSerializerDto(FeedbackResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateFeedbackStatusSchema))
  async updateFeedbackStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.updateStatus(id, dto);
  }

  @Delete('feedback/:id')
  async deleteFeedback(@Param('id') id: string) {
    return this.feedbackService.delete(id);
  }

  @Get('support/inquiries')
  @ZodSerializerDto(ContactInquiryListResponseDto)
  async getSupportInquiries(@Query('limit') limit?: string) {
    const parsedLimit = parsePaginationInt(limit, { min: 1, max: 200 }) ?? 100;
    return this.contactService.listInquiries(parsedLimit);
  }

  @Get('support/whatsapp')
  @ZodSerializerDto(SupportWhatsAppThreadListResponseDto)
  async getSupportWhatsAppThreads(
    @Query() query?: SupportWhatsAppThreadsQueryDto,
  ) {
    const parsedLimit =
      parsePaginationInt(String(query?.limit ?? ''), {
        min: 1,
        max: 200,
      }) ?? 100;
    return this.supportWhatsAppInboxService.listThreads(parsedLimit);
  }

  @Get('support/whatsapp/:threadPhoneNumber/messages')
  @ZodSerializerDto(SupportWhatsAppMessageListResponseDto)
  async getSupportWhatsAppThreadMessages(
    @Param('threadPhoneNumber') threadPhoneNumber: string,
    @Query() query?: SupportWhatsAppThreadMessagesQueryDto,
  ) {
    const parsedLimit =
      parsePaginationInt(String(query?.limit ?? ''), {
        min: 1,
        max: 500,
      }) ?? 500;
    return this.supportWhatsAppInboxService.listThreadMessages(
      threadPhoneNumber,
      parsedLimit,
    );
  }

  @Patch('support/whatsapp/:threadPhoneNumber/read')
  @ZodSerializerDto(SupportWhatsAppReadResponseDto)
  async markSupportWhatsAppThreadRead(
    @Param('threadPhoneNumber') threadPhoneNumber: string,
  ) {
    const updatedCount = await this.supportWhatsAppInboxService.markThreadAsRead(
        threadPhoneNumber,
      );

    return { updatedCount };
  }

  @Post('support/whatsapp/:threadPhoneNumber/reply')
  @ZodSerializerDto(SupportWhatsAppReplyResponseDto)
  async replyToSupportWhatsAppThread(
    @Param('threadPhoneNumber') threadPhoneNumber: string,
    @Body() dto: SupportWhatsAppReplyDto,
  ) {
    return this.supportWhatsAppInboxService.replyToThread(
      threadPhoneNumber,
      dto.message,
      dto.replyToProviderMessageId,
    );
  }

  @Get('broadcasts')
  @ZodSerializerDto(WhatsAppBroadcastJobListResponseDto)
  async listBroadcasts(@Query('limit') limit?: string) {
    const parsedLimit = parsePaginationInt(limit, { min: 1, max: 200 }) ?? 50;
    return this.whatsAppBroadcastService.listJobs(parsedLimit);
  }

  @Get('broadcasts/:id')
  @ZodSerializerDto(WhatsAppBroadcastJobDetailDto)
  async getBroadcast(@Param('id') id: string) {
    return this.whatsAppBroadcastService.getJob(id);
  }

  @Post('broadcasts')
  @ZodSerializerDto(WhatsAppBroadcastJobSummaryDto)
  async createBroadcast(@Body() dto: CreateWhatsAppBroadcastDto) {
    return this.whatsAppBroadcastService.createBroadcast(dto);
  }
}
