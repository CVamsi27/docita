import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type WhatsappPersistenceKey =
  | '$transaction'
  | 'appointment'
  | 'appointmentResponse'
  | 'clinic'
  | 'clinicSecret'
  | 'invoice'
  | 'patient'
  | 'prescription'
  | 'staffNotification'
  | 'user'
  | 'whatsappLog';

export type WhatsappPersistencePort = Pick<
  PrismaDelegatePort,
  WhatsappPersistenceKey
>;

export const WHATSAPP_PERSISTENCE_PORT = 'WhatsappPersistencePort';
