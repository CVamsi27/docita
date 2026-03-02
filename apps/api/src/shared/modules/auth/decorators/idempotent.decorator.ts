import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'idempotent_metadata';

export interface IdempotentOptions {
  header?: string;
  ttl?: number;
}

export const Idempotent = (options: IdempotentOptions = {}) =>
  SetMetadata(IDEMPOTENT_METADATA_KEY, {
    header: 'x-idempotency-key',
    ttl: 24 * 60 * 60,
    ...options,
  });
