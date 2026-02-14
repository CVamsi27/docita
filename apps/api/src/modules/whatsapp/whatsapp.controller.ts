import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Headers,
  RawBodyRequest,
  UsePipes,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { WhatsappService } from './whatsapp.service';
import { SendTemplateDto, sendTemplateSchema } from './dto/send-template.dto';
import { MetaWebhookPayload } from './types/webhook.types';
import { Request } from 'express';
import {
  WhatsappTemplateListResponseDto,
  WhatsappDefaultTemplatesResponseDto,
  WhatsappMessageResponseDto,
  WhatsappLogListResponseDto,
  WhatsappStatsResponseDto,
  SuccessResponseDto,
} from './dto/whatsapp-response.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

// ... (comments elided for brevity if not strictly needed)

import { Public } from '../auth/public.decorator';

import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('whatsapp')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly whatsappWebhook: WhatsappWebhookService,
  ) {}

  // ==========================================================================
  // Template Management
  // ==========================================================================

  /**
   * List all templates for the clinic
   */
  @Get('templates')
  @ZodSerializerDto(WhatsappTemplateListResponseDto)
  async listTemplates(@Req() req: Request) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }
    return this.whatsappService.listTemplates(user.clinicId);
  }

  /**
   * Get default template names
   */
  @Get('templates/defaults')
  @ZodSerializerDto(WhatsappDefaultTemplatesResponseDto)
  getDefaultTemplates() {
    return this.whatsappService.getDefaultTemplateNames();
  }

  /**
   * Seed default templates for clinic
   */
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

  // ==========================================================================
  // Message Sending
  // ==========================================================================

  /**
   * Send a template-based WhatsApp message
   */
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

  /**
   * Resend prescription via WhatsApp
   */
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

  /**
   * Resend invoice via WhatsApp
   */
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

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  // Note: Webhooks usually return raw 'OK' or challenge integer, not JSON.
  // ZodSerializer might break this if it expects JSON.
  // Skipping ZodSerializer for webhooks as they are machine-to-machine with strict protocol.

  /**
   * Meta webhook verification (GET request)
   */
  @Public()
  @Get('webhook')
  handleWebhookVerification(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
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

  /**
   * Meta incoming message webhook
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIncomingWebhook(
    @Body() payload: MetaWebhookPayload,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    if (req.rawBody && signature) {
      const isValid = this.whatsappWebhook.validateWebhookSignature(
        req.rawBody,
        signature,
      );
      if (!isValid) {
        this.logger.warn('Invalid webhook signature received');
        return 'OK';
      }
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

  // ==========================================================================
  // Message Logs
  // ==========================================================================

  /**
   * Get WhatsApp message logs for the clinic
   */
  @Get('logs')
  @ZodSerializerDto(WhatsappLogListResponseDto)
  async getLogs(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('patientId') patientId?: string,
    @Query('type') type?: string,
  ) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    return this.whatsappService.getLogs(user.clinicId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      patientId,
      type,
    });
  }

  // ==========================================================================
  // Approval Workflow
  // ==========================================================================

  /**
   * Approve a prescription for WhatsApp sharing
   */
  @Post('approve-prescription/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async approvePrescription(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string; role: string };

    if (
      user.role !== 'DOCTOR' &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new BadRequestException(
        'Only doctors and admins can approve prescriptions',
      );
    }

    return this.whatsappService.approvePrescription(id, user.id);
  }

  /**
   * Approve an invoice for WhatsApp sharing
   */
  @Post('approve-invoice/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async approveInvoice(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string; role: string };

    if (
      user.role !== 'DOCTOR' &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new BadRequestException(
        'Only doctors and admins can approve invoices',
      );
    }

    return this.whatsappService.approveInvoice(id, user.id);
  }

  /**
   * Get WhatsApp statistics for the clinic
   */
  @Get('stats')
  @ZodSerializerDto(WhatsappStatsResponseDto)
  async getStats(@Req() req: Request) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }

    return this.whatsappService.getWhatsappStats(user.clinicId);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  // findRecentAppointmentByPhone moved to WhatsappService
}
