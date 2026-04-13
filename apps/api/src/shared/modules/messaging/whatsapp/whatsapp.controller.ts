import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
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
  APP_ACCESS_TARGETS,
  updateWhatsAppSettingsRequestSchema,
  createMedicineReminderRequestSchema,
  createWhatsAppBroadcastRequestSchema,
  WhatsAppWebhookPayload,
} from '@workspace/types';

import { Public } from '@/shared/modules/auth/auth/public.decorator';

import { WhatsappWebhookService } from './whatsapp-webhook.service';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { PrismaService } from '@/prisma/prisma.service';
import { readWhatsAppWebhookVerificationQuery } from '@/shared/modules/messaging/whatsapp/whatsapp-webhook-query.util';

@Controller('whatsapp')
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly whatsappWebhook: WhatsappWebhookService,
    private readonly prisma: PrismaService,
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

  @Get('settings')
  async getSettings(@Req() req: Request) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { settings: true },
    });
    const settings =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};

    return {
      appointmentReminders: settings.whatsappAppointmentReminders !== false,
      followUpMessages: settings.whatsappFollowUpMessages === true,
      birthdayWishes: settings.whatsappBirthdayWishes === true,
      medicineReminders: settings.whatsappMedicineReminders !== false,
      labReportNotifications: settings.whatsappLabReportNotifications !== false,
      emergencyAlerts: settings.whatsappEmergencyAlerts !== false,
    };
  }

  @UsePipes(new ZodValidationPipe(updateWhatsAppSettingsRequestSchema))
  @Put('settings')
  async updateSettings(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { settings: true },
    });
    const currentSettings =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};

    const parsed = updateWhatsAppSettingsRequestSchema.parse(body);
    const nextSettings = {
      ...currentSettings,
      ...(parsed.appointmentReminders !== undefined
        ? { whatsappAppointmentReminders: parsed.appointmentReminders }
        : {}),
      ...(parsed.followUpMessages !== undefined
        ? { whatsappFollowUpMessages: parsed.followUpMessages }
        : {}),
      ...(parsed.birthdayWishes !== undefined
        ? { whatsappBirthdayWishes: parsed.birthdayWishes }
        : {}),
      ...(parsed.medicineReminders !== undefined
        ? { whatsappMedicineReminders: parsed.medicineReminders }
        : {}),
      ...(parsed.labReportNotifications !== undefined
        ? { whatsappLabReportNotifications: parsed.labReportNotifications }
        : {}),
      ...(parsed.emergencyAlerts !== undefined
        ? { whatsappEmergencyAlerts: parsed.emergencyAlerts }
        : {}),
    };

    await this.prisma.clinic.update({
      where: { id: user.clinicId },
      data: { settings: nextSettings },
    });

    return { success: true };
  }

  @UsePipes(new ZodValidationPipe(createMedicineReminderRequestSchema))
  @Post('medicine-reminder')
  async createMedicineReminder(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const user = req.user as { clinicId: string; id: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    const parsed = createMedicineReminderRequestSchema.parse(body);
    return this.whatsappService.handleSendTemplate(user.clinicId, user.id, {
      templateId: 'medicine_reminder',
      phoneNumber: parsed.patientPhone,
      variables: {
        medicineName: parsed.medicineName,
        dosage: parsed.dosage,
        frequency: parsed.frequency,
        reminderTime: parsed.reminderTime,
      },
    });
  }

  @UsePipes(new ZodValidationPipe(createWhatsAppBroadcastRequestSchema))
  @Post('broadcast')
  async createBroadcast(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const user = req.user as { clinicId: string; id: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    const parsed = createWhatsAppBroadcastRequestSchema.parse(body);
    this.logger.log(
      `WhatsApp campaign requested by ${user.id} for clinic ${user.clinicId}: ${parsed.campaignName}`,
    );

    return { success: true, message: 'Campaign created successfully' };
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
  handleWebhookVerification(@Req() req: Request) {
    const {
      mode,
      verifyToken: token,
      challenge,
    } = readWhatsAppWebhookVerificationQuery(req.query);
    this.logger.log(`Webhook verification request: mode=${mode}`);

    if (
      mode === 'subscribe' &&
      token === this.whatsappWebhook.getVerifyToken() &&
      challenge
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
    const user = req.user as { id: string; clinicId?: string };
    await this.whatsappService.deleteAllNotifications(user.id, user.clinicId!);
    return { success: true, message: 'All notifications deleted' };
  }
}
