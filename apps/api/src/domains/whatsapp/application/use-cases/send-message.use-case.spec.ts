import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SendMessageUseCase } from './send-message.use-case';
import { createFixedClockMock } from '@/test-utils';
import { IWhatsAppRepository } from '../ports/whatsapp.repository.port';
import { IWhatsAppClient } from '../ports/whatsapp-client.port';
import {
  ResolvedTemplate,
  TemplateResolverService,
} from '../../core/services/template-resolver.service';
import {
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '../../core/entities/whatsapp-message.entity';
import { WhatsAppTemplate } from '../../core/entities/whatsapp-template.entity';
import { WhatsappMessageDeliveryService } from '../services/whatsapp-message-delivery.service';

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;

  const saveMessageMock = jest.fn<IWhatsAppRepository['saveMessage']>();
  const ensureConversationMock =
    jest.fn<IWhatsAppRepository['ensureConversation']>();
  const findMessageByIdMock = jest.fn<IWhatsAppRepository['findMessageById']>();
  const findMessageByExternalIdMock =
    jest.fn<IWhatsAppRepository['findMessageByExternalId']>();
  const findClinicMessageContextMock =
    jest.fn<IWhatsAppRepository['findClinicMessageContext']>();
  const saveTemplateMock = jest.fn<IWhatsAppRepository['saveTemplate']>();
  const findTemplateByIdMock =
    jest.fn<IWhatsAppRepository['findTemplateById']>();
  const findTemplateByNameMock =
    jest.fn<IWhatsAppRepository['findTemplateByName']>();
  const listTemplatesByClinicMock =
    jest.fn<IWhatsAppRepository['listTemplatesByClinic']>();
  const isAutomationEnabledMock =
    jest.fn<IWhatsAppRepository['isAutomationEnabled']>();

  const mockRepository: IWhatsAppRepository = {
    ensureConversation: ensureConversationMock,
    saveMessage: saveMessageMock,
    findMessageById: findMessageByIdMock,
    findMessageByExternalId: findMessageByExternalIdMock,
    findClinicMessageContext: findClinicMessageContextMock,
    saveTemplate: saveTemplateMock,
    findTemplateById: findTemplateByIdMock,
    findTemplateByName: findTemplateByNameMock,
    listTemplatesByClinic: listTemplatesByClinicMock,
    isAutomationEnabled: isAutomationEnabledMock,
  };

  const sendMessageMock = jest.fn<IWhatsAppClient['sendMessage']>();
  const sendInteractiveMessageMock =
    jest.fn<IWhatsAppClient['sendInteractiveMessage']>();
  const checkHealthMock = jest.fn<IWhatsAppClient['checkHealth']>();

  const mockClient: IWhatsAppClient = {
    sendMessage: sendMessageMock,
    sendInteractiveMessage: sendInteractiveMessageMock,
    checkHealth: checkHealthMock,
  };

  const mockTemplateResolver = Object.create(
    TemplateResolverService.prototype,
  ) as TemplateResolverService;
  const resolveTemplateMock =
    jest.fn<TemplateResolverService['resolveTemplate']>();
  mockTemplateResolver.resolveTemplate = resolveTemplateMock;

  const mockConfigService = Object.create(
    AppConfigService.prototype,
  ) as AppConfigService;
  const getMetaConfigMock = jest.fn<AppConfigService['getMetaConfig']>();
  mockConfigService.getMetaConfig = getMetaConfigMock;

  const emitMock = jest.fn();
  const mockEventEmitter = {
    emit: emitMock,
  } as unknown as EventEmitter2;

  function createUseCase() {
    const delivery = new WhatsappMessageDeliveryService(
      mockClient,
      mockTemplateResolver,
      mockConfigService,
    );
    return new SendMessageUseCase(
      mockRepository,
      delivery,
      mockEventEmitter,
      createFixedClockMock(),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();

    saveMessageMock.mockResolvedValue();
    ensureConversationMock.mockResolvedValue('conv-001');
    findMessageByIdMock.mockResolvedValue(null);
    findMessageByExternalIdMock.mockResolvedValue(null);
    findClinicMessageContextMock.mockResolvedValue({
      tier: ClinicTier.ESSENTIAL,
      intelligenceAddon: IntelligenceAddon.NONE,
      features: {},
      name: 'Clinic',
      branding: null,
    });
    saveTemplateMock.mockResolvedValue();
    findTemplateByIdMock.mockResolvedValue(null);
    findTemplateByNameMock.mockResolvedValue(null);
    listTemplatesByClinicMock.mockResolvedValue([] as WhatsAppTemplate[]);
    isAutomationEnabledMock.mockResolvedValue(true);

    sendMessageMock.mockResolvedValue({ externalId: 'wamid.ext001' });
    sendInteractiveMessageMock.mockResolvedValue({
      externalId: 'wamid.int001',
    });
    checkHealthMock.mockResolvedValue(true);

    resolveTemplateMock.mockResolvedValue(null);

    getMetaConfigMock.mockReturnValue({
      accessToken: 'test-token',
      phoneNumberId: 'test-phone-id',
      businessAccountId: 'test-biz-id',
      appSecret: 'test-secret',
      verifyToken: 'test-verify',
      productionMode: false,
    });

    useCase = createUseCase();
  });

  describe('plain text message', () => {
    it('should send a plain text message and save it', async () => {
      const result = await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        text: 'Your appointment is confirmed.',
      });

      expect(sendMessageMock).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'From Clinic\nYour appointment is confirmed.',
      });
      expect(saveMessageMock).toHaveBeenCalledTimes(1);
      expect(result.messageId).toBeDefined();
      expect(result.providerMessageId).toBeDefined();
      expect(emitMock).toHaveBeenCalledWith(
        'whatsapp.message.sent',
        expect.objectContaining({
          clinicId: 'clinic-123',
          messageType: 'session',
        }),
      );
    });

    it('throws ForbiddenException when clinic tier does not include WhatsApp', async () => {
      findClinicMessageContextMock.mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        intelligenceAddon: IntelligenceAddon.NONE,
        features: {},
        name: 'Clinic',
        branding: null,
      });

      await expect(
        useCase.execute({
          clinicId: 'clinic-123',
          recipientPhone: '919876543210',
          text: 'Hello',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(sendMessageMock).not.toHaveBeenCalled();
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should throw when neither templateName nor text provided', async () => {
      await expect(
        useCase.execute({
          clinicId: 'clinic-123',
          recipientPhone: '919876543210',
        }),
      ).rejects.toThrow('Either templateName or text must be provided');
    });
  });

  describe('template message (sandbox mode)', () => {
    it('should resolve template and send plain text in sandbox mode', async () => {
      const resolved: ResolvedTemplate = {
        content: 'Hello John',
        buttons: undefined,
        buttonType: 'QUICK_REPLY',
        textFallback: 'Hello John',
        variables: [],
      };
      resolveTemplateMock.mockResolvedValue(resolved);

      const result = await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'appointment_reminder',
        variables: { patientName: 'John' },
      });

      expect(resolveTemplateMock).toHaveBeenCalledWith(
        'appointment_reminder',
        { clinicName: 'Clinic', patientName: 'John' },
        'clinic-123',
      );
      expect(sendMessageMock).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'From Clinic\nHello John',
      });
      expect(result.messageId).toBeDefined();
    });

    it('should send interactive buttons when template has buttons', async () => {
      resolveTemplateMock.mockResolvedValue({
        content: 'Confirm appointment?',
        buttons: [
          { id: 'btn_confirm', text: 'Confirm' },
          { id: 'btn_cancel', text: 'Cancel' },
        ],
        buttonType: 'QUICK_REPLY',
        textFallback: 'Confirm appointment?',
        variables: [],
      });

      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'appointment_confirm',
      });

      expect(sendInteractiveMessageMock).toHaveBeenCalledWith({
        to: '919876543210',
        bodyText: 'From Clinic\nConfirm appointment?',
        buttons: [
          { id: 'btn_confirm', title: 'Confirm' },
          { id: 'btn_cancel', title: 'Cancel' },
        ],
      });
    });

    it('should send Meta template API call in production mode', async () => {
      getMetaConfigMock.mockReturnValue({
        accessToken: 'prod-token',
        phoneNumberId: 'prod-phone-id',
        businessAccountId: 'biz-id',
        appSecret: 'secret',
        verifyToken: 'verify',
        productionMode: true,
      });

      useCase = createUseCase();

      resolveTemplateMock.mockResolvedValue({
        content: 'Hello',
        buttons: undefined,
        buttonType: 'QUICK_REPLY',
        textFallback: 'Hello',
        metaTemplateId: 'meta-tmpl-001',
        variables: [{ name: 'patientName', required: true }],
      });

      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'appointment_reminder_24hr',
        variables: { patientName: 'John' },
      });

      expect(sendMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          templateName: 'appointment_reminder_24hr',
        }),
      );
    });

    it('should fall back to plain text when template not found', async () => {
      resolveTemplateMock.mockResolvedValue(null);

      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'nonexistent_template',
        text: 'fallback text',
      });

      expect(sendMessageMock).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'From Clinic\nfallback text',
      });
    });
  });

  describe('message persistence', () => {
    it('should save message with correct clinicId and recipientPhone', async () => {
      await useCase.execute({
        clinicId: 'clinic-abc',
        recipientPhone: '910123456789',
        text: 'Test',
      });

      const saved = saveMessageMock.mock.calls[0][0] as WhatsAppMessage;
      expect(saved.clinicId).toBe('clinic-abc');
      expect(saveMessageMock).toHaveBeenCalledTimes(1);
    });

    it('should save message with DISPATCHED status initially', async () => {
      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        text: 'Test',
      });

      const saved = saveMessageMock.mock.calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.DISPATCHED);
    });
  });
});
