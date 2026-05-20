import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HandleWebhookUseCase } from './handle-webhook.use-case';
import { WhatsAppWebhookIngressService } from '../services/whatsapp-webhook-ingress.service';
import { asType } from '@/test-utils';
import {
  WhatsAppWebhookDeliveryStatus,
  WhatsAppWebhookPayload,
} from '@workspace/types';

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

describe('HandleWebhookUseCase', () => {
  let useCase: HandleWebhookUseCase;

  const processIncomingMessagesMock =
    jest.fn<WhatsAppWebhookIngressService['processIncomingMessages']>();
  const processStatusUpdatesMock =
    jest.fn<WhatsAppWebhookIngressService['processStatusUpdates']>();

  const mockIngress = {
    processIncomingMessages: processIncomingMessagesMock,
    processStatusUpdates: processStatusUpdatesMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    processIncomingMessagesMock.mockResolvedValue();
    processStatusUpdatesMock.mockResolvedValue();

    useCase = new HandleWebhookUseCase(
      asType<WhatsAppWebhookIngressService>(mockIngress),
    );
  });

  it('routes status updates through the ingress service', async () => {
    await useCase.execute({
      payload: createStatusPayload([
        {
          id: 'wamid.ext001',
          status: 'delivered',
          timestamp: '123',
          recipient_id: '919876543210',
        },
      ]),
    });

    expect(processStatusUpdatesMock).toHaveBeenCalledTimes(1);
    expect(processIncomingMessagesMock).not.toHaveBeenCalled();
  });

  it('routes incoming messages through the ingress service', async () => {
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

    expect(processIncomingMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            id: 'wamid.inbound001',
          }),
        ],
      }),
    );
    expect(processStatusUpdatesMock).not.toHaveBeenCalled();
  });

  it('ignores non-message webhook fields', async () => {
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

    expect(processIncomingMessagesMock).not.toHaveBeenCalled();
    expect(processStatusUpdatesMock).not.toHaveBeenCalled();
  });
});
