import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WhatsAppWebhookIngressService } from './whatsapp-webhook-ingress.service';
import { truncatePhone } from '@workspace/utils';
import { WhatsAppMessageStatus } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';
import { asType } from '@/test-utils';

function mockDateNow() {
  return new Date('2026-01-15T10:00:00Z');
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg_001',
    from: '919876543210',
    type: 'text',
    text: { body: 'hello' },
    timestamp: '1705312800',
    context: undefined as unknown,
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
  };
}

describe('WhatsAppWebhookIngressService', () => {
  let service: WhatsAppWebhookIngressService;

  const persistence = {
    whatsappMessage: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
    },
    clinic: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'clinic_1' }),
    },
    patient: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
    },
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    whatsappLog: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}),
    },
    whatsappConversation: {
      upsert: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'conv_1' }),
    },
  } as Record<string, unknown>;

  const repository = {
    findMessageByExternalId: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
    saveMessage: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}),
  } as Record<string, unknown>;

  const supportInboxService = {
    recordIncomingMessages: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined),
    updateMessageStatus: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined),
  } as Record<string, unknown>;

  const responseHandler = {
    handlePatientResponseForAppointment: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined),
  } as Record<string, unknown>;

  const appointmentResolver = {
    resolveForInboundMessage: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
  } as Record<string, unknown>;

  const clock = {
    now: jest.fn(() => mockDateNow()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = new WhatsAppWebhookIngressService(
      asType<Parameters<typeof WhatsAppWebhookIngressService['constructor']>[0]>(persistence),
      asType<Parameters<typeof WhatsAppWebhookIngressService['constructor']>[1]>(repository),
      asType<Parameters<typeof WhatsAppWebhookIngressService['constructor']>[2]>(supportInboxService),
      asType<Parameters<typeof WhatsAppWebhookIngressService['constructor']>[3]>(responseHandler),
      asType<Parameters<typeof WhatsAppWebhookIngressService['constructor']>[4]>(appointmentResolver),
      asType<Parameters<typeof WhatsAppWebhookIngressService['constructor']>[5]>(clock),
    );
  });

  describe('processIncomingMessages', () => {
    it('delegates to supportInboxService first', async () => {
      const value = makeWebhookValue({ messages: [] });
      await service.processIncomingMessages(value);
      expect(supportInboxService.recordIncomingMessages).toHaveBeenCalledWith(value);
    });

    it('processes text messages and records conversation', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'hi' } });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest.fn().mockImplementation(async (fn: (tx: typeof persistence) => Promise<void>) => {
        await fn(persistence as never);
      });

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('processes interactive button_reply messages', async () => {
      const msg = makeMessage({
        type: 'interactive',
        interactive: { button_reply: { id: 'btn_1', title: 'Yes' } },
      });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest.fn().mockImplementation(async (fn: (tx: typeof persistence) => Promise<void>) => {
        await fn(persistence as never);
      });

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('processes interactive list_reply messages', async () => {
      const msg = makeMessage({
        type: 'interactive',
        interactive: { list_reply: { id: 'list_1', title: 'Option A' } },
      });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest.fn().mockImplementation(async (fn: (tx: typeof persistence) => Promise<void>) => {
        await fn(persistence as never);
      });

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('processes button type messages', async () => {
      const msg = makeMessage({
        type: 'button',
        button: { payload: 'confirm', text: 'Confirm' },
      });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest.fn().mockImplementation(async (fn: (tx: typeof persistence) => Promise<void>) => {
        await fn(persistence as never);
      });

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).toHaveBeenCalled();
    });

    it('skips messages with no response content', async () => {
      const msg = makeMessage({ type: 'image', text: undefined, interactive: undefined, button: undefined });
      const value = makeWebhookValue({ messages: [msg] });

      await service.processIncomingMessages(value);

      expect(persistence.whatsappConversation.upsert).not.toHaveBeenCalled();
    });

    it('warns when no appointment context is found (truncatePhone redaction)', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'confirm' } });
      const value = makeWebhookValue({ messages: [msg] });
      appointmentResolver.resolveForInboundMessage = jest.fn().mockResolvedValue(null);
      // Stub $transaction to resolve immediately (skip conversation recording internals)
      persistence.$transaction = jest.fn().mockResolvedValue(undefined);

      await service.processIncomingMessages(value);

      // The warn is emitted when no appointment context is found for the message.
      // truncatePhone masks the phone to ***3210.
      const warnCalls = (Logger.prototype.warn as jest.Mock).mock.calls.map((c: unknown[]) => String(c[0]));
      const noMatchWarn = warnCalls.find((w) => w.includes('No matching appointment'));
      expect(noMatchWarn).toBeDefined();
      expect(noMatchWarn).toContain('***3210');
    });

    it('calls responseHandler when appointment context is found', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'yes' } });
      const value = makeWebhookValue({ messages: [msg] });
      appointmentResolver.resolveForInboundMessage = jest.fn().mockResolvedValue({ appointmentId: 'apt_1' });
      // Stub $transaction to resolve immediately (skip conversation recording internals)
      persistence.$transaction = jest.fn().mockResolvedValue(undefined);

      await service.processIncomingMessages(value);

      expect(responseHandler.handlePatientResponseForAppointment).toHaveBeenCalled();
    });

    it('logs error with truncated phone on processing failure', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'test' } });
      const value = makeWebhookValue({ messages: [msg] });
      persistence.$transaction = jest.fn().mockRejectedValue(new Error('db failure'));

      await service.processIncomingMessages(value);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing incoming message from ***3210'),
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
      persistence.whatsappMessage.findFirst = jest.fn().mockResolvedValue({
        conversation: { clinicId: 'clinic_from_ctx' },
      });
      persistence.$transaction = jest.fn().mockImplementation(async (fn: (tx: typeof persistence) => Promise<void>) => {
        await fn(persistence as never);
      });

      await service.processIncomingMessages(value);

      expect(persistence.whatsappMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ providerMsgId: 'ctx_msg_123' }) }),
      );
    });

    it('resolves clinic from whatsappPhoneNumberId when no context message', async () => {
      const msg = makeMessage({ type: 'text', text: { body: 'test' }, context: undefined });
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
      persistence.clinic.findFirst = jest.fn().mockResolvedValue(null);

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
      const status = makeStatus({ status: 'delivered', timestamp: '1705312800' });
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
        errors: [{ code: 131047, title: 'Reengagement window', message: 'expired' }],
      });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('syncs domain message status when found', async () => {
      const mockMessage = {
        id: 'dom_msg_1',
        updateStatus: jest.fn(),
        setError: jest.fn(),
      };
      repository.findMessageByExternalId = jest.fn().mockResolvedValue(mockMessage);

      const status = makeStatus({ status: 'delivered' });
      const value = makeWebhookValue({ statuses: [status] });

      await service.processStatusUpdates(value);

      expect(mockMessage.updateStatus).toHaveBeenCalledWith(WhatsAppMessageStatus.DELIVERED, mockDateNow());
      expect(repository.saveMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('warns when domain message is not found', async () => {
      repository.findMessageByExternalId = jest.fn().mockResolvedValue(null);

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
        updateStatus: jest.fn(),
        setError: jest.fn(),
      };
      repository.findMessageByExternalId = jest.fn().mockResolvedValue(mockMessage);

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
