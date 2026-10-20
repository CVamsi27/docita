import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WhatsAppWebhookIngressService } from './whatsapp-webhook-ingress.service';
import { truncatePhone } from '@workspace/utils';
import { WhatsAppMessageStatus } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';

function mockDateNow() {
  return new Date('2026-01-15T10:00:00Z');
}

type WebhookValue = Parameters<
  WhatsAppWebhookIngressService['processIncomingMessages']
>[0];

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg_001',
    from: '919876543210',
    type: 'text' as const,
    text: { body: 'hello' },
    timestamp: '1705312800',
    ...overrides,
  };
}

function makeStatus(overrides: Record<string, unknown> = {}) {
  return {
    id: 'status_001',
    status: 'sent',
    timestamp: '1705312800',
    recipient_id: '919876543210',
    ...overrides,
  };
}

function makeWebhookValue(overrides: Record<string, unknown> = {}) {
  return {
    messaging_product: 'whatsapp',
    metadata: { phone_number_id: 'pn_123', display_phone_number: '+1234' },
    contacts: [],
    messages: [] as ReturnType<typeof makeMessage>[],
    statuses: [] as ReturnType<typeof makeStatus>[],
    ...overrides,
  } as unknown as WebhookValue;
}

describe('WhatsAppWebhookIngressService', () => {
  let service: WhatsAppWebhookIngressService;

  const persistence: any = {
    whatsappMessage: {
      findFirst: jest.fn<any>().mockResolvedValue(null),
      findUnique: jest.fn<any>().mockResolvedValue(null),
      upsert: jest.fn<any>().mockResolvedValue({}),
    },
    clinic: {
      findFirst: jest.fn<any>().mockResolvedValue({ id: 'clinic_1' }),
    },
    patient: {
      findFirst: jest.fn<any>().mockResolvedValue(null),
    },
    $transaction: jest.fn<any>(),
    whatsappLog: {
      findFirst: jest.fn<any>().mockResolvedValue(null),
      update: jest.fn<any>().mockResolvedValue({}),
    },
    whatsappConversation: {
      upsert: jest.fn<any>().mockResolvedValue({ id: 'conv_1' }),
    },
  };

  const repository: any = {
    findMessageByExternalId: jest.fn<any>().mockResolvedValue(null),
    saveMessage: jest.fn<any>().mockResolvedValue({}),
  };

  const supportInboxService: any = {
    recordIncomingMessages: jest.fn<any>().mockResolvedValue(undefined),
    updateMessageStatus: jest.fn<any>().mockResolvedValue(undefined),
  };

  const responseHandler: any = {
    handlePatientResponseForAppointment: jest
      .fn<any>()
      .mockResolvedValue(undefined),
  };

  const appointmentResolver: any = {
    resolveForInboundMessage: jest.fn<any>().mockResolvedValue(null),
  };

  const clock = {
    now: jest.fn(() => mockDateNow()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = new WhatsAppWebhookIngressService(
      persistence,
      repository,
      supportInboxService,
      responseHandler,
      appointmentResolver,
      clock,
    );
  });

  describe('processIncomingMessages', () => {
    it('delegates to supportInboxService first', async () => {
      const value = makeWebhookValue({ messages: [] });
      await service.processIncomingMessages(value);
      expect(supportInboxService.recordIncomingMessages).toHaveBeenCalledWith(
        value,
      );
    });

    it('processes text messages and records conversation', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'hi' } });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest
        .fn<any>()
        .mockImplementation(async (fn: any) => fn(persistence));

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('processes interactive button_reply messages', async () => {
      const msg = makeMessage({
        type: 'interactive',
        interactive: { button_reply: { id: 'btn_1', title: 'Yes' } },
      });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest
        .fn<any>()
        .mockImplementation(async (fn: any) => fn(persistence));

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('processes interactive list_reply messages', async () => {
      const msg = makeMessage({
        type: 'interactive',
        interactive: { list_reply: { id: 'list_1', title: 'Option A' } },
      });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest
        .fn<any>()
        .mockImplementation(async (fn: any) => fn(persistence));

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('processes button type messages', async () => {
      const msg = makeMessage({
        type: 'button',
        button: { payload: 'confirm', text: 'Confirm' },
      });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest
        .fn<any>()
        .mockImplementation(async (fn: any) => fn(persistence));

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('skips messages with no response content', async () => {
      const msg = makeMessage({
        type: 'image',
        text: undefined,
        interactive: undefined,
        button: undefined,
      });
      const value = makeWebhookValue({ messages: [msg] });

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).not.toHaveBeenCalled();
    });

    it('warns when no appointment context is found (truncatePhone redaction)', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'confirm' } });
      const value = makeWebhookValue({ messages: [msg] });
      appointmentResolver.resolveForInboundMessage = jest
        .fn<any>()
        .mockResolvedValue(null);
      persistence.$transaction = jest.fn<any>().mockResolvedValue(true);

      await service.processIncomingMessages(value);

      const warnCalls = (Logger.prototype.warn as jest.Mock).mock.calls.map(
        (c: unknown[]) => String(c[0]),
      );
      const noMatchWarn = warnCalls.find((w) =>
        w.includes('No matching appointment'),
      );
      expect(noMatchWarn).toBeDefined();
      expect(noMatchWarn).toContain('***3210');
    });

    it('calls responseHandler when appointment context is found', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'yes' } });
      const value = makeWebhookValue({ messages: [msg] });
      appointmentResolver.resolveForInboundMessage = jest
        .fn<any>()
        .mockResolvedValue({ appointmentId: 'apt_1' });
      persistence.$transaction = jest.fn<any>().mockResolvedValue(true);

      await service.processIncomingMessages(value);

      expect(
        responseHandler.handlePatientResponseForAppointment,
      ).toHaveBeenCalled();
    });

    it('skips response handling for duplicate provider deliveries', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'yes' } });
      const value = makeWebhookValue({ messages: [msg] });
      appointmentResolver.resolveForInboundMessage = jest
        .fn<any>()
        .mockResolvedValue({ appointmentId: 'apt_1' });
      persistence.whatsappMessage.findUnique.mockResolvedValueOnce({
        id: 'inbound_msg_001',
      });
      persistence.$transaction = jest.fn<any>().mockResolvedValue(false);

      await service.processIncomingMessages(value);

      expect(
        responseHandler.handlePatientResponseForAppointment,
      ).not.toHaveBeenCalled();
    });

    it('logs error with truncated phone on processing failure', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'test' } });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest
        .fn<any>()
        .mockRejectedValue(new Error('db failure'));

      await service.processIncomingMessages(value);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error processing incoming message from ***3210',
        ),
        expect.anything(),
      );
    });

    it('reads context message id from message.context', async () => {
      const msg = makeMessage({
        type: 'text',
        text: { body: 'reply' },
        context: { id: 'ctx_msg_123' },
      });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.whatsappMessage.findFirst = jest.fn<any>().mockResolvedValue({
        conversation: { clinicId: 'clinic_from_ctx' },
      });
      persistence.$transaction = jest.fn<any>().mockResolvedValue(undefined);

      await service.processIncomingMessages(value);

      expect(persistence.whatsappMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ providerMsgId: 'ctx_msg_123' }),
        }),
      );
    });

    it('resolves clinic from whatsappPhoneNumberId when no context message', async () => {
      const msg = makeMessage({
        type: 'text',
        text: { body: 'test' },
        context: undefined,
      });
      const value = makeWebhookValue({ messages: [msg] });

      await service.processIncomingMessages(value);

      expect(persistence.clinic.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ whatsappPhoneNumberId: 'pn_123' }),
        }),
      );
    });

    it('quarantines message when no clinic is resolved', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'test' } });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.clinic.findFirst = jest.fn<any>().mockResolvedValue(null);

      await service.processIncomingMessages(value);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('could not be resolved to a clinic'),
      );
    });
  });

  describe('processStatusUpdates', () => {
    it('processes sent status updates', async () => {
      const status = makeStatus({ status: 'sent' });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Status update for status_001: sent'),
      );
    });

    it('processes delivered status with timestamp', async () => {
      const status = makeStatus({
        status: 'delivered',
        timestamp: '1705312800',
      });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('processes read status', async () => {
      const status = makeStatus({ status: 'read', timestamp: '1705312800' });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('processes failed status with errors', async () => {
      const status = makeStatus({
        status: 'failed',
        errors: [
          { code: 131047, title: 'Reengagement window', message: 'expired' },
        ],
      });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('syncs domain message status when found', async () => {
      const mockMessage = {
        id: 'dom_msg_1',
        updateStatus: jest.fn<any>(),
        setError: jest.fn<any>(),
      };
      repository.findMessageByExternalId = jest
        .fn<any>()
        .mockResolvedValue(mockMessage);

      const status = makeStatus({ status: 'delivered' });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(mockMessage.updateStatus).toHaveBeenCalledWith(
        WhatsAppMessageStatus.DELIVERED,
        mockDateNow(),
      );
      expect(repository.saveMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('warns when domain message is not found', async () => {
      repository.findMessageByExternalId = jest
        .fn<any>()
        .mockResolvedValue(null);

      const status = makeStatus({ status: 'sent' });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
    });

    it('handles failed domain message with error details', async () => {
      const mockMessage = {
        id: 'dom_msg_2',
        updateStatus: jest.fn<any>(),
        setError: jest.fn<any>(),
      };
      repository.findMessageByExternalId = jest
        .fn<any>()
        .mockResolvedValue(mockMessage);

      const status = makeStatus({
        status: 'failed',
        errors: [{ code: 131047, title: 'error', message: 'bad' }],
      });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(mockMessage.setError).toHaveBeenCalled();
    });

    it('updates support inbox status', async () => {
      const status = makeStatus({ status: 'sent' });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(supportInboxService.updateMessageStatus).toHaveBeenCalledWith(
        'status_001',
        'sent',
        undefined,
      );
    });
  });
});

describe('truncatePhone (imported by ingress service)', () => {
  it('masks phone numbers in log output', () => {
    expect(truncatePhone('919876543210')).toBe('***3210');
  });
});
