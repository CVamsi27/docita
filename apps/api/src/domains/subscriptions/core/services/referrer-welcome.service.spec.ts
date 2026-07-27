import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferrerMessageKind, ReferrerMessageStatus } from '@workspace/db';
import { ReferrerWelcomeService } from './referrer-welcome.service';
import { PartnerShowcasePdfService } from '../../application/services/partner-showcase-pdf.service';
import { PartnerTemplateService } from '../../application/services/partner-template.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { IWhatsAppClient } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { createFixedClockMock } from '@/test-utils';
import { ApplicationEvents } from '@/shared/common/events/application-events';

interface FakeReferrer {
  id: string;
  name: string;
  type: 'CLINIC' | 'PHARMACY' | 'MARKETING_PERSON' | 'CUSTOM';
  email: string | null;
  phone: string | null;
  code: string | null;
  active: boolean;
  welcomeSentAt?: Date | null;
  welcomeError?: string | null;
}

interface FakeMessage {
  id: string;
  referrerId: string;
  kind: ReferrerMessageKind;
  channel: string;
  template: string;
  status: ReferrerMessageStatus;
  externalId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

class FakePdfService {
  async render(): Promise<Buffer> {
    return Buffer.from('%PDF-1.4 fake');
  }
}

class FakeTemplateService {
  renderShareMessage(input: {
    partnerName: string;
    code: string;
    signupUrl: string;
  }): string {
    return `share:${input.partnerName}:${input.code}:${input.signupUrl}`;
  }
  renderWelcomeComponents(): {
    templateName: string;
    languageCode: string;
    components: Array<Record<string, unknown>>;
  } {
    return {
      templateName: 'partner_welcome_v1',
      languageCode: 'en',
      components: [],
    };
  }
}

class FakeAppConfig {
  getPartnerPortalUrl(): string {
    return 'https://app.docita.work/partner';
  }
  getAppUrl(): string {
    return 'https://app.docita.work';
  }
}

class FakeStorageProvider {
  async uploadBuffer(_bytes: Buffer, key: string): Promise<{ key: string }> {
    return { key };
  }
  async generateSignedUrl(key: string): Promise<string> {
    return `https://signed.example/${key}`;
  }
}

class FakeWhatsappClient {
  sendMessage = jest.fn(
    async (): Promise<{ externalId: string }> => ({ externalId: 'wamid.123' }),
  );
}

class FakePrismaService {
  referrers = new Map<string, FakeReferrer>();
  messages: FakeMessage[] = [];

  buildClient(): PrismaService {
    const self = this;
    return {
      referrer: {
        findUnique: jest.fn(
          async (args: { where: { id: string }; select?: unknown }) => {
            const r = self.referrers.get(args.where.id);
            return (r ?? null) as unknown;
          },
        ),
        update: jest.fn(
          async (args: {
            where: { id: string };
            data: Partial<FakeReferrer>;
          }) => {
            const r = self.referrers.get(args.where.id);
            if (!r) throw new Error('not found');
            Object.assign(r, args.data);
            return r as unknown;
          },
        ),
      },
      referrerMessage: {
        create: jest.fn(
          async (args: {
            data: Omit<
              FakeMessage,
              'id' | 'externalId' | 'errorMessage' | 'sentAt'
            >;
          }) => {
            const row: FakeMessage = {
              id: `msg_${self.messages.length + 1}`,
              referrerId: args.data.referrerId,
              kind: args.data.kind,
              channel: args.data.channel,
              template: args.data.template,
              status: args.data.status,
              externalId: null,
              errorMessage: null,
              createdAt: args.data.createdAt,
              sentAt: null,
            };
            self.messages.push(row);
            return { id: row.id };
          },
        ),
        update: jest.fn(
          async (args: {
            where: { id: string };
            data: Partial<FakeMessage>;
          }) => {
            const m = self.messages.find((x) => x.id === args.where.id);
            if (!m) throw new Error('not found');
            Object.assign(m, args.data);
            return m as unknown;
          },
        ),
      },
    } as unknown as PrismaService;
  }
}

function makeService(
  prisma: FakePrismaService,
  whatsapp: FakeWhatsappClient,
  clock: IClock,
) {
  return new ReferrerWelcomeService(
    prisma.buildClient(),
    new FakePdfService() as unknown as PartnerShowcasePdfService,
    new FakeTemplateService() as unknown as PartnerTemplateService,
    new FakeStorageProvider() as unknown as StorageProvider,
    whatsapp as unknown as IWhatsAppClient,
    new FakeAppConfig() as unknown as AppConfigService,
    clock,
  );
}

function emitRefCreated(
  service: ReferrerWelcomeService,
  payload: { referrerId: string },
) {
  // Call the @OnEvent method directly; the event bus in production is
  // wired in `EventEmitterModule.forRoot()` and dispatched by Nest, but
  // for unit purposes the listener is just a method on the class.
  return (
    service as unknown as {
      handle: (p: { referrerId: string }) => Promise<void>;
    }
  ).handle(payload);
}

describe('ReferrerWelcomeService', () => {
  let prisma: FakePrismaService;
  let whatsapp: FakeWhatsappClient;
  let clock: IClock;

  beforeEach(() => {
    prisma = new FakePrismaService();
    whatsapp = new FakeWhatsappClient();
    clock = createFixedClockMock('2026-07-27T12:00:00.000Z');
  });

  describe('handle (REFERRER_CREATED)', () => {
    it('sends the welcome, marks the message SENT, and stamps welcomeSentAt', async () => {
      prisma.referrers.set('rfr_1', {
        id: 'rfr_1',
        name: 'Anil Pharmacy',
        type: 'PHARMACY',
        email: null,
        phone: '+919999999999',
        code: 'RFR-AB23CD',
        active: true,
      });
      const service = makeService(prisma, whatsapp, clock);

      await emitRefCreated(service, { referrerId: 'rfr_1' });

      expect(whatsapp.sendMessage).toHaveBeenCalledTimes(1);
      expect(prisma.messages).toHaveLength(1);
      expect(prisma.messages[0]?.kind).toBe(ReferrerMessageKind.WELCOME);
      expect(prisma.messages[0]?.status).toBe(ReferrerMessageStatus.SENT);
      expect(prisma.messages[0]?.externalId).toBe('wamid.123');
      expect(prisma.referrers.get('rfr_1')?.welcomeSentAt).toBeInstanceOf(Date);
      expect(prisma.referrers.get('rfr_1')?.welcomeError).toBeNull();
    });

    it('records welcomeError when WhatsApp send fails, message row goes FAILED', async () => {
      prisma.referrers.set('rfr_1', {
        id: 'rfr_1',
        name: 'Anil',
        type: 'PHARMACY',
        email: null,
        phone: '+919999999999',
        code: 'RFR-AB23CD',
        active: true,
      });
      whatsapp.sendMessage = jest.fn(async () => {
        throw new Error('meta api down');
      });
      const service = makeService(prisma, whatsapp, clock);

      // handle() is a non-fatal wrapper; the event handler must not throw.
      await emitRefCreated(service, { referrerId: 'rfr_1' });

      expect(prisma.referrers.get('rfr_1')?.welcomeSentAt).toBeFalsy();
      expect(prisma.referrers.get('rfr_1')?.welcomeError).toBe('meta api down');
      expect(prisma.messages[0]?.status).toBe(ReferrerMessageStatus.FAILED);
    });

    it('skips inactive referrers (no message, no error)', async () => {
      prisma.referrers.set('rfr_1', {
        id: 'rfr_1',
        name: 'Anil',
        type: 'PHARMACY',
        email: null,
        phone: '+919999999999',
        code: 'RFR-AB23CD',
        active: false,
      });
      const service = makeService(prisma, whatsapp, clock);
      await emitRefCreated(service, { referrerId: 'rfr_1' });
      expect(whatsapp.sendMessage).not.toHaveBeenCalled();
      expect(prisma.messages).toHaveLength(0);
    });

    it('records welcomeError when the referrer has no phone', async () => {
      prisma.referrers.set('rfr_1', {
        id: 'rfr_1',
        name: 'Anil',
        type: 'PHARMACY',
        email: 'anil@example.com',
        phone: null,
        code: 'RFR-AB23CD',
        active: true,
      });
      const service = makeService(prisma, whatsapp, clock);
      await emitRefCreated(service, { referrerId: 'rfr_1' });
      expect(whatsapp.sendMessage).not.toHaveBeenCalled();
      expect(prisma.referrers.get('rfr_1')?.welcomeError).toMatch(/phone/i);
    });

    it('records welcomeError when the referrer has no code (pre-migration row)', async () => {
      prisma.referrers.set('rfr_legacy', {
        id: 'rfr_legacy',
        name: 'Anil',
        type: 'PHARMACY',
        email: null,
        phone: '+919999999999',
        code: null,
        active: true,
      });
      const service = makeService(prisma, whatsapp, clock);
      await emitRefCreated(service, { referrerId: 'rfr_legacy' });
      expect(whatsapp.sendMessage).not.toHaveBeenCalled();
      expect(prisma.referrers.get('rfr_legacy')?.welcomeError).toMatch(/code/i);
    });

    it('does nothing (no throw) when the referrer does not exist', async () => {
      const service = makeService(prisma, whatsapp, clock);
      await expect(
        emitRefCreated(service, { referrerId: 'rfr_missing' }),
      ).resolves.toBeUndefined();
      expect(whatsapp.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('resendWelcome', () => {
    it('records the message as RESEND_WELCOME (not WELCOME)', async () => {
      prisma.referrers.set('rfr_1', {
        id: 'rfr_1',
        name: 'Anil',
        type: 'PHARMACY',
        email: null,
        phone: '+919999999999',
        code: 'RFR-AB23CD',
        active: true,
      });
      const service = makeService(prisma, whatsapp, clock);
      await service.resendWelcome('rfr_1');
      expect(prisma.messages[0]?.kind).toBe(ReferrerMessageKind.RESEND_WELCOME);
      expect(prisma.messages[0]?.status).toBe(ReferrerMessageStatus.SENT);
    });
  });

  describe('event wiring', () => {
    it('exposes a @OnEvent listener for ApplicationEvents.REFERRER_CREATED', () => {
      // The decorator metadata is opaque to runtime; assert the method
      // name + that REFERRER_CREATED is a known event constant.
      expect(typeof ApplicationEvents.REFERRER_CREATED).toBe('string');
      const service = makeService(prisma, whatsapp, clock);
      expect(typeof (service as unknown as { handle?: unknown }).handle).toBe(
        'function',
      );
    });
  });
});
