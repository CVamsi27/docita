import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type PublicBookingPersistenceKey =
  | 'appointment'
  | 'clinic'
  | 'doctorClinic'
  | 'patient'
  | 'publicBookingOtp'
  | 'user';

export type PublicBookingPersistencePort = Pick<
  PrismaDelegatePort,
  PublicBookingPersistenceKey
>;

export const PUBLIC_BOOKING_PERSISTENCE_PORT = 'PublicBookingPersistencePort';
