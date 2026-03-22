import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards as _UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException as _NotFoundException,
  Headers,
  RawBodyRequest,
  UsePipes,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { WhatsappService } from './whatsapp.service';
import { SendTemplateDto, sendTemplateSchema } from './dto/send-template.dto';
import { Request } from 'express';
import {
  WhatsappTemplateListResponseDto,
  WhatsappDefaultTemplatesResponseDto,
  WhatsappMessageResponseDto,
  WhatsappLogListResponseDto,
  WhatsappStatsResponseDto,
  WhatsappUnreadCountResponseDto,
  WhatsappUnreadNotificationsResponseDto,
  SuccessResponseDto,
  WhatsappLogsQueryDto,
  WhatsappUnreadNotificationsQueryDto,
} from './dto/whatsapp-response.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
  WhatsAppWebhookPayload,
  WhatsAppWebhookVerifyQuery,
} from '@workspace/types';

import { Public } from '@/shared/modules/auth/auth/public.decorator';

import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('whatsapp')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly whatsappWebhook: WhatsappWebhookService,
  ) {}

  @Get('templates')
  @ZodSerializerDto(WhatsappTemplateListResponseDto)
  async listTemplates(@Req() req: Request) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }
    return this.whatsappService.listTemplates(user.clinicId);
  }

  @Get('templates/defaults')
  @ZodSerializerDto(WhatsappDefaultTemplatesResponseDto)
  getDefaultTemplates() {
    return this.whatsappService.getDefaultTemplateNames();
  }

  @Post('templates/seed')
  @ZodSerializerDto(SuccessResponseDto)
  async seedTemplates(@Req() req: Request) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }
    await this.whatsappService.seedDefaultTemplates(user.clinicId);
    return { success: true, message: 'Templates seeded successfully' };
  }

  @Post('send')
  @ZodSerializerDto(WhatsappMessageResponseDto)
  @UsePipes(new ZodValidationPipe(sendTemplateSchema))
  async sendTemplateMessage(@Req() req: Request, @Body() dto: SendTemplateDto) {
    const user = req.user as { clinicId: string; id: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    return this.whatsappService.handleSendTemplate(user.clinicId, user.id, dto);
  }

  @Post('resend-prescription/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async resendPrescription(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { clinicId: string; id: string; role: string };
    return this.whatsappService.resendPrescription(
      user.clinicId,
      user.id,
      user.role,
      id,
    );
  }

  @Post('resend-invoice/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async resendInvoice(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { clinicId: string; id: string; role: string };
    return this.whatsappService.resendInvoice(
      user.clinicId,
      user.id,
      user.role,
      id,
    );
  }

  @Public()
  @Get('webhook')
  handleWebhookVerification(@Query() query: WhatsAppWebhookVerifyQuery) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    this.logger.log(`Webhook verification request: mode=${mode}`);

    if (
      mode === 'subscribe' &&
      token === this.whatsappWebhook.getVerifyToken()
    ) {
      this.logger.log('Webhook verified successfully');
      return parseInt(challenge, 10);
    }

    this.logger.warn('Webhook verification failed - invalid token');
    throw new BadRequestException('Webhook verification failed');
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIncomingWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    if (!req.rawBody || !signature) {
      this.logger.warn('Webhook rejected: missing rawBody or signature header');
      return 'OK';
    }

    const isValid = this.whatsappWebhook.validateWebhookSignature(
      req.rawBody,
      signature,
    );
    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
      return 'OK';
    }

    try {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value.messages && value.messages.length > 0) {
            await this.whatsappWebhook.processIncomingMessages(value);
          }
          if (value.statuses && value.statuses.length > 0) {
            await this.whatsappWebhook.processStatusUpdates(value);
          }
        }
      }
      return 'OK';
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return 'OK';
    }
  }

  @Get('logs')
  @ZodSerializerDto(WhatsappLogListResponseDto)
  async getLogs(@Req() req: Request, @Query() query?: WhatsappLogsQueryDto) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    return this.whatsappService.getLogs(user.clinicId, {
      limit: query?.limit,
      patientId: query?.patientId,
      type: query?.type,
    });
  }

  @Post('approve-prescription/:id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(SuccessResponseDto)
  async approvePrescription(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string; clinicId: string };
    return this.whatsappService.approvePrescription(id, user.id, user.clinicId);
  }

  @Post('approve-invoice/:id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(SuccessResponseDto)
  async approveInvoice(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string; clinicId: string };
    return this.whatsappService.approveInvoice(id, user.id, user.clinicId);
  }

  @Get('stats')
  @ZodSerializerDto(WhatsappStatsResponseDto)
  async getStats(@Req() req: Request) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    return this.whatsappService.getWhatsappStats(user.clinicId);
  }

  @Get('notifications/unread-count')
  @ZodSerializerDto(WhatsappUnreadCountResponseDto)
  async getUnreadNotificationCount(@Req() req: Request) {
    const user = req.user as { id: string };
    const count = await this.whatsappService.getUnreadNotificationCount(
      user.id,
    );
    return { count };
  }

  @Get('notifications/unread')
  @ZodSerializerDto(WhatsappUnreadNotificationsResponseDto)
  async getUnreadNotifications(
    @Req() req: Request,
    @Query() query?: WhatsappUnreadNotificationsQueryDto,
  ) {
    const user = req.user as { id: string };
    return this.whatsappService.getUnreadNotifications(user.id, query?.limit);
  }

  @Delete('notifications/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async deleteNotification(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    await this.whatsappService.deleteNotification(id, user.id);
    return { success: true, message: 'Notification deleted' };
  }

  @Delete('notifications')
  @ZodSerializerDto(SuccessResponseDto)
  async deleteAllNotifications(@Req() req: Request) {
    const user = req.user as { id: string };
    await this.whatsappService.deleteAllNotifications(user.id);
    return { success: true, message: 'All notifications deleted' };
  }
}
