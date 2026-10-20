import { describe, expect, it } from '@jest/globals';
import { EnvSchema } from './env-schema';

const flags = [
  ['WHATSAPP_PRODUCTION_MODE', false],
  ['WHATSAPP_PER_CLINIC_SENDER_ENABLED', false],
  ['ENTERPRISE_CONTRACT_DYNAMIC_PRICING_ENABLED', false],
  ['ENABLE_SCHEDULERS', true],
  ['AI_CACHE_ENABLED', true],
  ['AI_EXTERNAL_ENABLED', false],
  ['AI_CLOUD_OCR_ENABLED', false],
  ['RLS_ENABLED', false],
  ['ALLOW_TEST_EMAIL_AUTOVERIFY', false],
  ['DATABASE_CONTROL_ENABLED', false],
  ['DATABASE_CONTROL_DEPLOY_GUARD', true],
] as const;

const accepted = [
  [false, false],
  [true, true],
  [0, false],
  [1, true],
  ['false', false],
  ['0', false],
  ['no', false],
  ['off', false],
  ['true', true],
  ['1', true],
  ['yes', true],
  ['on', true],
  [' FALSE ', false],
  [' ON ', true],
] as const;

describe.each(flags)('%s runtime switch', (name, defaultValue) => {
  it.each(accepted)('parses %p as %p', (input, expected) => {
    expect(EnvSchema.shape[name].parse(input)).toBe(expected);
  });

  it('preserves its default when the setting is missing', () => {
    expect(EnvSchema.shape[name].parse(undefined)).toBe(defaultValue);
  });

  it.each(['', 'enabled', '2', 'null', 2, -1, NaN, null, {}, []])(
    'rejects ambiguous or invalid input %p',
    (input) => {
      expect(EnvSchema.shape[name].safeParse(input).success).toBe(false);
    },
  );
});
