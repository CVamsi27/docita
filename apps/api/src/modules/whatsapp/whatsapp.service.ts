import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Twilio;

  constructor() {
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async sendMessage({ to, message }: { to: string; message: string }) {
    try {
      const from =
        process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
      // Ensure 'to' number has 'whatsapp:' prefix
      const toNum = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const result = await this.client.messages.create({
        body: message,
        from,
        to: toNum,
      });

      this.logger.log(`WhatsApp message sent to ${to}: ${result.sid}`);
      return { success: true, messageId: result.sid };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${to}`, error);
      throw error;
    }
  }
}
