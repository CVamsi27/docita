import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';

@Injectable()
export class WhatsappConfigService {
  getMetaConfig() {
    const config = getEnv();
    return {
      accessToken: config.META_ACCESS_TOKEN || '',
      phoneNumberId: config.META_PHONE_NUMBER_ID || '',
      businessAccountId: config.META_BUSINESS_ACCOUNT_ID || '',
      appSecret: config.META_APP_SECRET || '',
      verifyToken: config.META_VERIFY_TOKEN || '',
      productionMode: config.WHATSAPP_PRODUCTION_MODE,
    };
  }

  isPerClinicWhatsappSenderEnabled(): boolean {
    return getEnv().WHATSAPP_PER_CLINIC_SENDER_ENABLED;
  }
}
