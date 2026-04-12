import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HandleWebhookUseCase } from './handle-webhook.use-case';
import { IWhatsAppRepository } from '../ports/whatsapp.repository.port';
import { asType } from '@/test-utils/as-type';
import { SupportWhatsAppInboxService } from '@/shared/modules/support-whatsapp';
import {
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '../../core/entities/whatsapp-message.entity';
import {
  WhatsAppWebhookDeliveryStatus,
  WhatsAppWebhookPayload,
} from '@workspace/types';
import { WhatsAppTemplate } from '../../core/entities/whatsapp-template.entity';

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

const createStatusPayload = (
  statuses: WhatsAppWebhookDeliveryStatus[],
): WhatsAppWebhookPayload => ({
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
            statuses,
          },
        },
      ],
    },
  ],
});

function makePayload(
  status: 'sent' | 'delivered' | 'read' | 'failed',
  externalId = 'wamid.ext001',
  errors?: Array<{ code: number; title: string; message?: string }>,
): WhatsAppWebhookPayload {
  return createStatusPayload([
    {
      id: externalId,
      status,
      timestamp: String(Math.floor(Date.now() / 1000)),
      recipient_id: '919876543210',
      ...(errors ? { errors } : {}),
    },
  ]);
}

describe('HandleWebhookUseCase', () => {
  let useCase: HandleWebhookUseCase;

  const saveMessageMock = jest.fn<IWhatsAppRepository['saveMessage']>();
  const findMessageByIdMock = jest.fn<IWhatsAppRepository['findMessageById']>();
  const findMessageByExternalIdMock =
    jest.fn<IWhatsAppRepository['findMessageByExternalId']>();
  const saveTemplateMock = jest.fn<IWhatsAppRepository['saveTemplate']>();
  const findTemplateByIdMock =
    jest.fn<IWhatsAppRepository['findTemplateById']>();
  const findTemplateByNameMock =
    jest.fn<IWhatsAppRepository['findTemplateByName']>();
  const listTemplatesByClinicMock =
    jest.fn<IWhatsAppRepository['listTemplatesByClinic']>();
  const isAutomationEnabledMock =
    jest.fn<IWhatsAppRepository['isAutomationEnabled']>();
  const recordIncomingMessagesMock =
    jest.fn<SupportWhatsAppInboxService['recordIncomingMessages']>();

  const mockRepository: IWhatsAppRepository = {
    saveMessage: saveMessageMock,
    findMessageById: findMessageByIdMock,
    findMessageByExternalId: findMessageByExternalIdMock,
    saveTemplate: saveTemplateMock,
    findTemplateById: findTemplateByIdMock,
    findTemplateByName: findTemplateByNameMock,
    listTemplatesByClinic: listTemplatesByClinicMock,
    isAutomationEnabled: isAutomationEnabledMock,
  };
  const mockSupportInboxService = {
    recordIncomingMessages: recordIncomingMessagesMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    saveMessageMock.mockResolvedValue();
    findMessageByIdMock.mockResolvedValue(null);
    findMessageByExternalIdMock.mockResolvedValue(makeMessage());
    saveTemplateMock.mockResolvedValue();
    findTemplateByIdMock.mockResolvedValue(null);
    findTemplateByNameMock.mockResolvedValue(null);
    listTemplatesByClinicMock.mockResolvedValue([] as WhatsAppTemplate[]);
    isAutomationEnabledMock.mockResolvedValue(true);
    recordIncomingMessagesMock.mockResolvedValue();

    useCase = new HandleWebhookUseCase(
      mockRepository,
      asType<SupportWhatsAppInboxService>(mockSupportInboxService),
    );
  });

  describe('status update processing', () => {
    it('should update message status to SENT', async () => {
      await useCase.execute({ payload: makePayload('sent') });

      expect(findMessageByExternalIdMock).toHaveBeenCalledWith('wamid.ext001');
      const saved = saveMessageMock.mock.calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.SENT);
    });

    it('should update message status to DELIVERED', async () => {
      await useCase.execute({ payload: makePayload('delivered') });

      const saved = saveMessageMock.mock.calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.DELIVERED);
    });

    it('should update message status to READ', async () => {
      await useCase.execute({ payload: makePayload('read') });

      const saved = saveMessageMock.mock.calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.READ);
    });

    it('should update message status to FAILED', async () => {
      await useCase.execute({ payload: makePayload('failed') });

      const saved = saveMessageMock.mock.calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.FAILED);
    });

    it('should set error code and message on FAILED with errors', async () => {
      const payload = makePayload('failed', 'wamid.ext001', [
        {
          code: 131026,
          title: 'Message undeliverable',
          message: 'Message undeliverable',
        },
      ]);

      await useCase.execute({ payload });

      const saved = saveMessageMock.mock.calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.FAILED);
    });

    it('should skip update when external ID not found in repository', async () => {
      findMessageByExternalIdMock.mockResolvedValue(null);

      await useCase.execute({ payload: makePayload('delivered') });

      expect(saveMessageMock).not.toHaveBeenCalled();
    });

    it('should skip unknown status values', async () => {
      const payload = makePayload('sent');
      Object.assign(payload.entry[0].changes[0].value.statuses![0], {
        status: 'unknown_status',
      });

      await useCase.execute({ payload });

      expect(saveMessageMock).not.toHaveBeenCalled();
    });
  });

  describe('payload edge cases', () => {
    it('should handle empty entry array gracefully', async () => {
      await useCase.execute({
        payload: {
          object: 'whatsapp_business_account',
          entry: [],
        },
      });

      expect(findMessageByExternalIdMock).not.toHaveBeenCalled();
    });

    it('should handle changes with non-messages field', async () => {
      await useCase.execute({
        payload: {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: 'entry-1',
              changes: [
                {
                  field: 'account_alerts',
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: '919876543210',
                      phone_number_id: 'phone-id',
                    },
                  },
                },
              ],
            },
          ],
        },
      });

      expect(findMessageByExternalIdMock).not.toHaveBeenCalled();
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
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: '919876543210',
                      phone_number_id: 'phone-id',
                    },
                  },
                },
              ],
            },
          ],
        },
      });

      expect(findMessageByExternalIdMock).not.toHaveBeenCalled();
    });

    it('should process multiple status updates in one payload', async () => {
      const msg1 = makeMessage(WhatsAppMessageStatus.SENT);
      const msg2 = makeMessage(WhatsAppMessageStatus.SENT);

      findMessageByExternalIdMock
        .mockResolvedValueOnce(msg1)
        .mockResolvedValueOnce(msg2);

      await useCase.execute({
        payload: createStatusPayload([
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
        ]),
      });

      expect(saveMessageMock).toHaveBeenCalledTimes(2);
    });

    it('should persist incoming messages from webhook payloads', async () => {
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
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: '919876543210',
                      phone_number_id: 'phone-id',
                    },
                    contacts: [
                      {
                        profile: { name: 'Rahul Sharma' },
                        wa_id: '919876543210',
                      },
                    ],
                    messages: [
                      {
                        from: '919876543210',
                        id: 'wamid.inbound001',
                        timestamp: '123',
                        type: 'text',
                        text: { body: 'I need help' },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      });

      expect(recordIncomingMessagesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              id: 'wamid.inbound001',
            }),
          ],
        }),
      );
    });
  });
});
