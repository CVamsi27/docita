import { describe, expect, it } from '@jest/globals';
import * as Decorators from './index';

describe('auth decorators index', () => {
  it('re-exports expected decorators', () => {
    expect(Decorators).toHaveProperty('SkipSubscriptionCheck');
    expect(Decorators).toHaveProperty('SkipPasswordExpiry');
    expect(Decorators).toHaveProperty('SkipEmailVerification');
    expect(Decorators).toHaveProperty('RequirePatientConsent');
  });
});
