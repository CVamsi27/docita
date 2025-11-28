import { Provider } from '@nestjs/common';
import { WhatsappService } from '../src/modules/whatsapp/whatsapp.service';

export const mockWhatsappService = {
  sendMessage: jest.fn().mockResolvedValue({
    sid: 'SM1234567890abcdef1234567890abcdef',
    status: 'queued',
  }),
  sendTemplate: jest.fn().mockResolvedValue({
    sid: 'SM1234567890abcdef1234567890abcdef',
    status: 'queued',
  }),
};

export const WhatsappServiceProvider: Provider = {
  provide: WhatsappService,
  useValue: mockWhatsappService,
};
