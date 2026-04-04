import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NlmCodingService } from './nlm-coding.service';

describe('NlmCodingService', () => {
  let service: NlmCodingService;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  const originalFetch = global.fetch;
  const jsonResponse = (payload: unknown, status = 200): Response =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  beforeEach(() => {
    service = new NlmCodingService();
    fetchMock = jest.fn<typeof fetch>();
    global.fetch = fetchMock;
  });

  it('searches CPT/HCPCS codes from NLM first when available', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        1,
        ['99213'],
        null,
        [['99213', 'Office or other outpatient visit']],
      ]),
    );

    const results = await service.searchCptCodes('office');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      expect.objectContaining({
        code: '99213',
        description: 'Office or other outpatient visit',
      }),
    ]);
  });

  it('falls back to local CPT catalog when HCPCS API is unavailable', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const first = await service.searchCptCodes('office');
    const second = await service.searchCptCodes('office');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(first.map((code) => code.code)).toContain('99213');
    expect(second.map((code) => code.code)).toContain('99213');
    warnSpy.mockRestore();
  });

  it('returns local CPT matches for queries even when API fallback is used', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const results = await service.searchCptCodes('office');

    expect(results[0]).toMatchObject({
      code: '99201',
      description: 'Office/Outpatient Visit - New Patient, 10 min',
      category: 'Evaluation and Management',
      isCommon: false,
    });
  });

  it('returns no CPT results for unmatched queries', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const results = await service.searchCptCodes('nonexistent procedure');

    expect(results).toEqual([]);
  });

  it('maps ICD search results from NLM response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        1,
        ['E11.9'],
        null,
        [['E11.9', 'Type 2 diabetes mellitus without complications']],
      ]),
    );

    const results = await service.searchIcdCodes('diabetes');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      expect.objectContaining({
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        category: 'Endocrine',
        version: 'ICD-10',
        isCommon: false,
      }),
    ]);
  });

  it('suppresses repeated ICD fetch failures during cooldown', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await service.searchIcdCodes('diabetes');
    await service.searchIcdCodes('hypertension');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('fetches ICD sync data with paginated API calls', async () => {
    const pageSize = 500;
    const firstPageRows = Array.from({ length: pageSize }, (_, idx) => [
      `A${String(idx).padStart(2, '0')}`,
      `Condition ${idx}`,
    ]);
    const secondPageRows = [['A500', 'Condition 500']];

    fetchMock.mockImplementation((url: unknown) => {
      const parsed = new URL(String(url));
      const terms = parsed.searchParams.get('terms');
      const offset = parsed.searchParams.get('offset');

      if (terms === 'A' && offset === '0') {
        return Promise.resolve(
          jsonResponse([
            501,
            firstPageRows.map((row) => row[0]),
            null,
            firstPageRows,
          ]),
        );
      }

      if (terms === 'A' && offset === '500') {
        return Promise.resolve(
          jsonResponse([
            501,
            secondPageRows.map((row) => row[0]),
            null,
            secondPageRows,
          ]),
        );
      }

      return Promise.resolve(jsonResponse([0, [], null, []]));
    });

    const results = await service.fetchAllIcdCodesForSync();

    expect(results.some((code) => code.code === 'A00')).toBe(true);
    expect(results.some((code) => code.code === 'A500')).toBe(true);
    expect(results.every((code) => code.isCommon)).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('terms=A'),
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('offset=500'),
      expect.any(Object),
    );
  });

  it('fetches CPT/HCPCS sync data from API', async () => {
    fetchMock.mockImplementation((url: unknown) => {
      const parsed = new URL(String(url));
      const terms = parsed.searchParams.get('terms');

      if (terms === 'A') {
        return Promise.resolve(
          jsonResponse([1, ['A4550'], null, [['A4550', 'Surgical trays']]]),
        );
      }

      return Promise.resolve(jsonResponse([0, [], null, []]));
    });

    const results = await service.fetchAllCptCodesForSync();

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'A4550',
          description: 'Surgical trays',
          category: 'HCPCS',
          isCommon: true,
        }),
      ]),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=obsolete%3Afalse'),
      expect.any(Object),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });
});
