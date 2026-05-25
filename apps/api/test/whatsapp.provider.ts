import { Provider } from '@nestjs/common';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';

export const mockWhatsappService = {
  sendMessage: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid.HBgLMTIzNDU2Nzg5MFUGAhEJAgQ=',
  }),
  sendTemplate: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid.HBgLMTIzNDU2Nzg5MFUGAhEJAgQ=',
  }),
  sendInteractiveButtons: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid.HBgLMTIzNDU2Nzg5MFUGAhEJAgQ=',
  }),
  validateWebhookSignature: jest.fn().mockReturnValue(true),
  getVerifyToken: jest.fn().mockReturnValue('test_verify_token'),
};

export const WhatsappServiceProvider: Provider = {
  provide: WhatsappService,
  useValue: mockWhatsappService,
};
