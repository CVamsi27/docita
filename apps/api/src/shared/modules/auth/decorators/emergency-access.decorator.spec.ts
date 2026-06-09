import 'reflect-metadata';
import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  EMERGENCY_ACCESS_KEY,
  EmergencyAccess,
} from './emergency-access.decorator';

describe('EmergencyAccess decorator', () => {
  class TestController {
    testRoute() {}
  }

  beforeEach(() => {
    Reflect.deleteMetadata(
      EMERGENCY_ACCESS_KEY,
      TestController.prototype.testRoute,
    );
  });

  it('sets emergency access metadata to true', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'testRoute',
    );

    if (!descriptor) throw new Error('Descriptor not found');

    EmergencyAccess()(TestController.prototype, 'testRoute', descriptor);

    const value = Reflect.getMetadata(
      EMERGENCY_ACCESS_KEY,
      TestController.prototype.testRoute,
    );
    expect(value).toBe(true);
  });
});
