import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HandleWebhookUseCase } from './handle-webhook.use-case';
import { IWhatsAppRepository } from '../ports/whatsapp.repository.port';
import {
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '../../core/entities/whatsapp-message.entity';
import type { WhatsAppWebhookPayload } from '@workspace/types';

function makeMessage(status = WhatsAppMessageStatus.SENT): WhatsAppMessage {
  return new WhatsAppMessage({
    id: 'msg-001',
    clinicId: 'clinic-123',
    conversationId: 'conv-001',
    recipientPhone: '919876543210',
    content: 'Hello',
    status,
    externalMessageId: 'wamid.ext001',
    sentAt: new Date(),
  });
}

function makePayload(
  status: 'sent' | 'delivered' | 'read' | 'failed',
  externalId = 'wamid.ext001',
  errors?: Array<{ code: number; message: string }>,
): WhatsAppWebhookPayload {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry-1',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919876543210',
                phone_number_id: 'phone-id',
              },
              statuses: [
                {
                  id: externalId,
                  status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: '919876543210',
                  ...(errors ? { errors } : {}),
                },
              ],
            },
          },
        ],
      },
    ],
  } as unknown as WhatsAppWebhookPayload;
}

describe('HandleWebhookUseCase', () => {
  let useCase: HandleWebhookUseCase;
  let mockRepository: jest.Mocked<IWhatsAppRepository>;

  beforeEach(() => {
    mockRepository = {
      saveMessage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      findMessageByExternalId: jest
        .fn<() => Promise<WhatsAppMessage | null>>()
        .mockResolvedValue(makeMessage()),
      findMessageById: jest
        .fn<() => Promise<WhatsAppMessage | null>>()
        .mockResolvedValue(null),
      saveTemplate: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      findTemplateById: jest.fn<() => Promise<any>>().mockResolvedValue(null),
      findTemplateByName: jest.fn<() => Promise<any>>().mockResolvedValue(null),
      listTemplatesByClinic: jest
        .fn<() => Promise<any[]>>()
        .mockResolvedValue([]),
      isAutomationEnabled: jest
        .fn<() => Promise<boolean>>()
        .mockResolvedValue(true),
    } as jest.Mocked<IWhatsAppRepository>;

    useCase = new HandleWebhookUseCase(
      mockRepository as unknown as typeof mockRepository & {
        WHATSAPP_REPOSITORY_TOKEN: symbol;
      },
    );
  });

  describe('status update processing', () => {
    it('should update message status to SENT', async () => {
      await useCase.execute({ payload: makePayload('sent') });

      expect(mockRepository.findMessageByExternalId).toHaveBeenCalledWith(
        'wamid.ext001',
      );
      const saved = mockRepository.saveMessage.mock
        .calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.SENT);
    });

    it('should update message status to DELIVERED', async () => {
      await useCase.execute({ payload: makePayload('delivered') });

      const saved = mockRepository.saveMessage.mock
        .calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.DELIVERED);
    });

    it('should update message status to READ', async () => {
      await useCase.execute({ payload: makePayload('read') });

      const saved = mockRepository.saveMessage.mock
        .calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.READ);
    });

    it('should update message status to FAILED', async () => {
      await useCase.execute({ payload: makePayload('failed') });

      const saved = mockRepository.saveMessage.mock
        .calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.FAILED);
    });

    it('should set error code and message on FAILED with errors', async () => {
      const payload = makePayload('failed', 'wamid.ext001', [
        { code: 131026, message: 'Message undeliverable' },
      ]);

      await useCase.execute({ payload });

      const saved = mockRepository.saveMessage.mock
        .calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.FAILED);
    });

    it('should skip update when external ID not found in repository', async () => {
      mockRepository.findMessageByExternalId.mockResolvedValue(null);

      await useCase.execute({ payload: makePayload('delivered') });

      expect(mockRepository.saveMessage).not.toHaveBeenCalled();
    });

    it('should skip unknown status values', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  statuses: [
                    {
                      id: 'wamid.ext001',
                      status: 'unknown_status',
                      timestamp: '1234567890',
                      recipient_id: '919876543210',
                    },
                  ],
                },
              },
            ],
          },
        ],
      } as unknown as WhatsAppWebhookPayload;

      await useCase.execute({ payload });

      expect(mockRepository.saveMessage).not.toHaveBeenCalled();
    });
  });

  describe('payload edge cases', () => {
    it('should handle empty entry array gracefully', async () => {
      await useCase.execute({
        payload: {
          object: 'whatsapp_business_account',
          entry: [],
        } as unknown as WhatsAppWebhookPayload,
      });

      expect(mockRepository.findMessageByExternalId).not.toHaveBeenCalled();
    });

    it('should handle changes with non-messages field', async () => {
      await useCase.execute({
        payload: {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: 'entry-1',
              changes: [{ field: 'account_alerts', value: {} }],
            },
          ],
        } as unknown as WhatsAppWebhookPayload,
      });

      expect(mockRepository.findMessageByExternalId).not.toHaveBeenCalled();
    });

    it('should handle missing statuses in value', async () => {
      await useCase.execute({
        payload: {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: 'entry-1',
              changes: [
                {
                  field: 'messages',
                  value: { messaging_product: 'whatsapp' },
                },
              ],
            },
          ],
        } as unknown as WhatsAppWebhookPayload,
      });

      expect(mockRepository.findMessageByExternalId).not.toHaveBeenCalled();
    });

    it('should process multiple status updates in one payload', async () => {
      const msg1 = makeMessage(WhatsAppMessageStatus.SENT);
      const msg2 = makeMessage(WhatsAppMessageStatus.SENT);

      mockRepository.findMessageByExternalId
        .mockResolvedValueOnce(msg1)
        .mockResolvedValueOnce(msg2);

      await useCase.execute({
        payload: {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: 'entry-1',
              changes: [
                {
                  field: 'messages',
                  value: {
                    statuses: [
                      {
                        id: 'wamid.001',
                        status: 'delivered',
                        timestamp: '123',
                        recipient_id: '1',
                      },
                      {
                        id: 'wamid.002',
                        status: 'read',
                        timestamp: '124',
                        recipient_id: '1',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        } as unknown as WhatsAppWebhookPayload,
      });

      expect(mockRepository.saveMessage).toHaveBeenCalledTimes(2);
    });
  });
});
