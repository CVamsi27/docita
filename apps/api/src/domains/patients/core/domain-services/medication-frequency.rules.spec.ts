import { describe, expect, it } from '@jest/globals';
import { parseFrequencyDoses } from './medication-frequency.rules';

describe('medication-frequency.rules', () => {
  it('parses once-daily terms', () => {
    expect(parseFrequencyDoses('once daily')).toBe(1);
    expect(parseFrequencyDoses('OD')).toBe(1);
  });

  it('parses twice-daily terms', () => {
    expect(parseFrequencyDoses('twice daily')).toBe(2);
    expect(parseFrequencyDoses('BID')).toBe(2);
  });

  it('parses three-times-daily terms', () => {
    expect(parseFrequencyDoses('three times daily')).toBe(3);
    expect(parseFrequencyDoses('TID')).toBe(3);
    expect(parseFrequencyDoses('thrice daily')).toBe(3);
  });

  it('parses four-times-daily terms', () => {
    expect(parseFrequencyDoses('four times daily')).toBe(4);
    expect(parseFrequencyDoses('QID')).toBe(4);
  });

  it('returns null for unrecognized frequencies', () => {
    expect(parseFrequencyDoses('as needed')).toBeNull();
  });
});
