import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';

@Injectable()
export class RazorpayConfigService {
  getRazorpayKeyId(): string {
    return getEnv().RAZORPAY_KEY_ID || '';
  }

  getRazorpayKeySecret(): string {
    return getEnv().RAZORPAY_KEY_SECRET || '';
  }

  getRazorpayWebhookSecret(): string {
    return getEnv().RAZORPAY_WEBHOOK_SECRET || '';
  }
}
