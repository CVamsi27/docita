import { describe, expect, it } from '@jest/globals';
import {
  buildVitalsNumericMetricDefinitions,
  cleanVitalsPayload,
} from './appointment-vitals-payload.rules';

describe('appointment-vitals-payload.rules', () => {
  it('cleans vitals payload to whitelisted fields', () => {
    const payload = cleanVitalsPayload({
      height: 170,
      weight: 70,
      pulse: 72,
      unknownField: 'ignored',
    } as never);

    expect(payload.height).toBe(170);
    expect(payload.pulse).toBe(72);
    expect('unknownField' in payload).toBe(false);
  });

  it('builds numeric metric definitions for recorded vitals', () => {
    const metrics = buildVitalsNumericMetricDefinitions(
      cleanVitalsPayload({ systolicBP: 120, diastolicBP: 80 }),
    );

    expect(metrics.map((m) => m.key)).toEqual(['systolic_bp', 'diastolic_bp']);
  });
});
