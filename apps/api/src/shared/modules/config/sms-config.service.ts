import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';

@Injectable()
export class SmsConfigService {
  getSmsConfig() {
    const config = getEnv();
    return {
      apiKey: config.SMS_API_KEY || '',
      senderId: config.SMS_SENDER_ID || '',
    };
  }
}
