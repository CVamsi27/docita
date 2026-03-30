import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NlmCodingService } from './nlm-coding.service';

describe('NlmCodingService', () => {
  let service: NlmCodingService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new NlmCodingService();
    global.fetch = jest.fn();
  });

  it('searches CPT codes from the local catalog without calling NLM', async () => {
    const results = await service.searchCptCodes('office');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(results.map((code) => code.code)).toContain('99213');
    expect(results[0]).toMatchObject({
      code: '99201',
      description: 'Office/Outpatient Visit - New Patient, 10 min',
      category: 'Evaluation & Management',
      isCommon: false,
    });
  });

  it('returns no CPT results for unmatched queries without calling NLM', async () => {
    const results = await service.searchCptCodes('nonexistent procedure');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
});
