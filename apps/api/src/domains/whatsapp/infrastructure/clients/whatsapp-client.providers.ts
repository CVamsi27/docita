import { WHATSAPP_CLIENT_TOKEN } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { WhatsappClientAdapter } from './whatsapp-client.adapter';

/**
 * Provider list for the WhatsApp client port. Shared by the API-side
 * and worker-side `WhatsAppModule`s so the `WHATSAPP_CLIENT_TOKEN`
 * binding lives in exactly one place; previously each module declared
 * the same `useExisting` provider, which jscpd flagged as duplication.
 */
export const WHATSAPP_CLIENT_PROVIDERS = [
  WhatsappClientAdapter,
  {
    provide: WHATSAPP_CLIENT_TOKEN,
    useExisting: WhatsappClientAdapter,
  },
] as const;
