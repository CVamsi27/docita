import { describe, expect, it } from '@jest/globals';
import {
  findInvalidMetricDefinitionIds,
  hasStructuredMetricValue,
} from './patient-metrics.rules';

describe('patient-metrics.rules', () => {
  describe('findInvalidMetricDefinitionIds', () => {
    it('returns IDs not present in valid definitions', () => {
      const invalid = findInvalidMetricDefinitionIds(
        ['def-1', 'def-2', 'def-missing'],
        [{ id: 'def-1' }, { id: 'def-2' }],
      );
      expect(invalid).toEqual(['def-missing']);
    });
  });

  describe('hasStructuredMetricValue', () => {
    it('returns false when no value fields are set', () => {
      expect(hasStructuredMetricValue({ definitionId: 'def-1' })).toBe(false);
    });

    it('returns true when a numeric value is provided', () => {
      expect(
        hasStructuredMetricValue({
          definitionId: 'def-1',
          valueNumber: 42,
        }),
      ).toBe(true);
    });
  });
});
