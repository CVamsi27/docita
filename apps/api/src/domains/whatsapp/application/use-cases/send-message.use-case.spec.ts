import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SendMessageUseCase } from './send-message.use-case';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  IWhatsAppRepository,
} from '../ports/whatsapp.repository.port';
import {
  WHATSAPP_CLIENT_TOKEN,
  IWhatsAppClient,
} from '../ports/whatsapp-client.port';
import { TemplateResolverService } from '../../core/services/template-resolver.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '../../core/entities/whatsapp-message.entity';
import {
  WhatsAppTemplate,
  WhatsAppTemplateStatus,
  WhatsAppTemplateCategory,
} from '../../core/entities/whatsapp-template.entity';

function makeMessage(
  overrides: Partial<ConstructorParameters<typeof WhatsAppMessage>[0]> = {},
): WhatsAppMessage {
  return new WhatsAppMessage({
    id: 'msg-001',
    clinicId: 'clinic-123',
    conversationId: 'conv-001',
    recipientPhone: '919876543210',
    content: 'Hello',
    status: WhatsAppMessageStatus.DISPATCHED,
    sentAt: new Date(),
    ...overrides,
  });
}

function makeTemplate(
  overrides: Partial<ConstructorParameters<typeof WhatsAppTemplate>[0]> = {},
): WhatsAppTemplate {
  return new WhatsAppTemplate({
    id: 'tmpl-001',
    clinicId: 'clinic-123',
    name: 'appointment_reminder',
    category: WhatsAppTemplateCategory.UTILITY,
    content: 'Hello {{patientName}}',
    status: WhatsAppTemplateStatus.APPROVED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;
  let mockRepository: jest.Mocked<IWhatsAppRepository>;
  let mockClient: jest.Mocked<IWhatsAppClient>;
  let mockTemplateResolver: jest.Mocked<TemplateResolverService>;
  let mockConfigService: jest.Mocked<AppConfigService>;

  beforeEach(() => {
    mockRepository = {
      saveMessage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      findMessageById: jest
        .fn<() => Promise<WhatsAppMessage | null>>()
        .mockResolvedValue(null),
      findMessageByExternalId: jest
        .fn<() => Promise<WhatsAppMessage | null>>()
        .mockResolvedValue(null),
      saveTemplate: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      findTemplateById: jest
        .fn<() => Promise<WhatsAppTemplate | null>>()
        .mockResolvedValue(null),
      findTemplateByName: jest
        .fn<() => Promise<WhatsAppTemplate | null>>()
        .mockResolvedValue(null),
      listTemplatesByClinic: jest
        .fn<() => Promise<WhatsAppTemplate[]>>()
        .mockResolvedValue([]),
      isAutomationEnabled: jest
        .fn<() => Promise<boolean>>()
        .mockResolvedValue(true),
    } as jest.Mocked<IWhatsAppRepository>;

    mockClient = {
      sendMessage: jest
        .fn<() => Promise<{ externalId: string }>>()
        .mockResolvedValue({ externalId: 'wamid.ext001' }),
      sendInteractiveMessage: jest
        .fn<() => Promise<{ externalId: string }>>()
        .mockResolvedValue({ externalId: 'wamid.int001' }),
      checkHealth: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    } as jest.Mocked<IWhatsAppClient>;

    mockTemplateResolver = {
      resolveTemplate: jest
        .fn<
          () => Promise<{
            content: string;
            buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION';
            textFallback: string;
            buttons?: Array<{ id: string; text: string }>;
          } | null>
        >()
        .mockResolvedValue(null),
    } as unknown as jest.Mocked<TemplateResolverService>;

    mockConfigService = {
      getMetaConfig: jest.fn().mockReturnValue({
        accessToken: 'test-token',
        phoneNumberId: 'test-phone-id',
        businessAccountId: 'test-biz-id',
        appSecret: 'test-secret',
        verifyToken: 'test-verify',
        productionMode: false,
      }),
    } as unknown as jest.Mocked<AppConfigService>;

    useCase = new SendMessageUseCase(
      mockRepository as unknown as typeof mockRepository & {
        [WHATSAPP_REPOSITORY_TOKEN]: symbol;
      },
      mockClient as unknown as typeof mockClient & {
        [WHATSAPP_CLIENT_TOKEN]: symbol;
      },
      mockTemplateResolver,
      mockConfigService,
    );
  });

  describe('plain text message', () => {
    it('should send a plain text message and save it', async () => {
      const result = await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        text: 'Your appointment is confirmed.',
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'Your appointment is confirmed.',
      });
      expect(mockRepository.saveMessage).toHaveBeenCalledTimes(1);
      expect(result.messageId).toBeDefined();
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
      mockTemplateResolver.resolveTemplate.mockResolvedValue({
        content: 'Hello John',
        buttons: undefined,
        buttonType: 'QUICK_REPLY',
        textFallback: 'Hello John',
      });

      const result = await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'appointment_reminder',
        variables: { patientName: 'John' },
      });

      expect(mockTemplateResolver.resolveTemplate).toHaveBeenCalledWith(
        'appointment_reminder',
        { patientName: 'John' },
        'clinic-123',
      );
      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'Hello John',
      });
      expect(result.messageId).toBeDefined();
    });

    it('should send interactive buttons when template has buttons', async () => {
      mockTemplateResolver.resolveTemplate.mockResolvedValue({
        content: 'Confirm appointment?',
        buttons: [
          { id: 'btn_confirm', text: 'Confirm' },
          { id: 'btn_cancel', text: 'Cancel' },
        ],
        buttonType: 'QUICK_REPLY',
        textFallback: 'Confirm appointment?',
      });

      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'appointment_confirm',
      });

      expect(mockClient.sendInteractiveMessage).toHaveBeenCalledWith({
        to: '919876543210',
        bodyText: 'Confirm appointment?',
        buttons: [
          { id: 'btn_confirm', title: 'Confirm' },
          { id: 'btn_cancel', title: 'Cancel' },
        ],
      });
    });

    it('should send Meta template API call in production mode', async () => {
      mockConfigService.getMetaConfig.mockReturnValue({
        accessToken: 'prod-token',
        phoneNumberId: 'prod-phone-id',
        businessAccountId: 'biz-id',
        appSecret: 'secret',
        verifyToken: 'verify',
        productionMode: true,
      });

      useCase = new SendMessageUseCase(
        mockRepository as unknown as typeof mockRepository & {
          [WHATSAPP_REPOSITORY_TOKEN]: symbol;
        },
        mockClient as unknown as typeof mockClient & {
          [WHATSAPP_CLIENT_TOKEN]: symbol;
        },
        mockTemplateResolver,
        mockConfigService,
      );

      mockTemplateResolver.resolveTemplate.mockResolvedValue({
        content: 'Hello',
        buttons: undefined,
        buttonType: 'QUICK_REPLY',
        textFallback: 'Hello',
        metaTemplateId: 'meta-tmpl-001',
      });

      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'appointment_reminder_24hr',
        variables: { patientName: 'John' },
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          templateName: 'appointment_reminder_24hr',
        }),
      );
    });

    it('should fall back to plain text when template not found', async () => {
      mockTemplateResolver.resolveTemplate.mockResolvedValue(null);

      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        templateName: 'nonexistent_template',
        text: 'fallback text',
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'fallback text',
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

      const saved = mockRepository.saveMessage.mock
        .calls[0][0] as WhatsAppMessage;
      expect(saved.clinicId).toBe('clinic-abc');
      expect(mockRepository.saveMessage).toHaveBeenCalledTimes(1);
    });

    it('should save message with DISPATCHED status initially', async () => {
      await useCase.execute({
        clinicId: 'clinic-123',
        recipientPhone: '919876543210',
        text: 'Test',
      });

      const saved = mockRepository.saveMessage.mock
        .calls[0][0] as WhatsAppMessage;
      expect(saved.status).toBe(WhatsAppMessageStatus.DISPATCHED);
    });
  });
});
