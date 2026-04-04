import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { IDEMPOTENT_METADATA_KEY, Idempotent } from './idempotent.decorator';

describe('Idempotent decorator', () => {
  class TestController {
    create() {}
  }

  it('applies default idempotency metadata', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'create',
    );

    if (!descriptor) {
      throw new Error('Descriptor not found');
    }

    Idempotent()(TestController.prototype, 'create', descriptor);

    const metadata = Reflect.getMetadata(
      IDEMPOTENT_METADATA_KEY,
      TestController.prototype.create,
    );
    expect(metadata).toEqual({
      header: 'x-idempotency-key',
      ttl: 24 * 60 * 60,
    });
  });

  it('applies custom metadata overrides', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'create',
    );

    if (!descriptor) {
      throw new Error('Descriptor not found');
    }

    Idempotent({ header: 'x-custom-key', ttl: 600 })(
      TestController.prototype,
      'create',
      descriptor,
    );

    const metadata = Reflect.getMetadata(
      IDEMPOTENT_METADATA_KEY,
      TestController.prototype.create,
    );
    expect(metadata).toEqual({
      header: 'x-custom-key',
      ttl: 600,
    });
  });
});
