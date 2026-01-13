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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';
import { SendTemplateDto } from './dto/send-template.dto';
import { MetaWebhookPayload } from './types/webhook.types';
import { Request } from 'express';

// ============================================================================
// DTOs
// ============================================================================

// DTOs moved to ./dto/send-template.dto.ts
// Webhook types moved to ./types/webhook.types.ts

/**
 * Meta WhatsApp Cloud API webhook payload
 */
// MetaWebhookPayload moved to ./types/webhook.types.ts

// ============================================================================
// Controller
// ============================================================================

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  // ==========================================================================
  // Template Management
  // ==========================================================================

  /**
   * List all templates for the clinic
   */
  @Get('templates')
  @UseGuards(JwtAuthGuard)
  async listTemplates(@Req() req: Request) {
    const user = req.user as { clinicId: string };
    if (!user.clinicId) {
      throw new BadRequestException('User not associated with a clinic');
    }
    // Note: While this currently just calls the templates service,
    // we could keep it in controller for simple proxying or move to WhatsappService
    // for consistency. Let's keep it calling templatesService for now but through controller.
    // Wait, I removed templatesService from constructor. I should call it through whatsappService
    // if I want to keep controller thin.
    return this.whatsappService.listTemplates(user.clinicId);
  }

  /**
   * Get default template names
   */
  @Get('templates/defaults')
  @UseGuards(JwtAuthGuard)
  getDefaultTemplates() {
    return this.whatsappService.getDefaultTemplateNames();
  }

  /**
   * Seed default templates for clinic
   */
  @Post('templates/seed')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  // Webhooks (Meta Cloud API Callbacks)
  // ==========================================================================

  /**
   * Meta webhook verification (GET request)
   * Called by Meta when setting up the webhook URL
   */
  @Get('webhook')
  handleWebhookVerification(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log(`Webhook verification request: mode=${mode}`);

    if (
      mode === 'subscribe' &&
      token === this.whatsappService.getVerifyToken()
    ) {
      this.logger.log('Webhook verified successfully');
      return parseInt(challenge, 10);
    }

    this.logger.warn('Webhook verification failed - invalid token');
    throw new BadRequestException('Webhook verification failed');
  }

  /**
   * Meta incoming message webhook - handles patient responses and status updates
   * This is called when a patient sends a message or when message status changes
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIncomingWebhook(
    @Body() payload: MetaWebhookPayload,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    if (req.rawBody && signature) {
      const isValid = this.whatsappService.validateWebhookSignature(
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
            await this.whatsappService.processIncomingMessages(value);
          }
          if (value.statuses && value.statuses.length > 0) {
            await this.whatsappService.processStatusUpdates(value);
          }
        }
      }
      return 'OK';
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return 'OK';
    }
  }

  // Webhook sub-processing moved to WhatsappService

  // ==========================================================================
  // Message Logs
  // ==========================================================================

  /**
   * Get WhatsApp message logs for the clinic
   */
  @Get('logs')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
