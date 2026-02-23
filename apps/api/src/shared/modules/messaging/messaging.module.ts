/**
 * Messaging Module
 * Provides multi-channel notification system (WhatsApp, Email, SMS)
 */

import { Module } from '@nestjs/common';
import { MessageTemplateService } from './templates';
import { NotificationOrchestrator } from './notification-orchestrator.service';
import { WhatsAppChannel, EmailChannel, SmsChannel } from './channels';

@Module({
  providers: [
    MessageTemplateService,
    NotificationOrchestrator,
    // Channel implementations
    WhatsAppChannel,
    EmailChannel,
    SmsChannel,
  ],
  exports: [NotificationOrchestrator, MessageTemplateService],
})
export class MessagingModule {}
