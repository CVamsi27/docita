import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LicensedCptCodeCatalogProvider } from './licensed-cpt-code-catalog.provider';
import { NlmCodeCatalogProvider } from './nlm-code-catalog.provider';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { CodeStreamOutcome } from '@/domains/clinical/core/providers/code-catalog.provider';

const FALLBACK_OUTCOME: CodeStreamOutcome = {
  completed: true,
  codesStreamed: 3,
  unitsSkipped: 0,
  lastUnit: 'A',
  source: 'NLM',
};

function mockConfig(configured: boolean): AppConfigService {
  return {
    getCptLicensedApiConfig: () => ({
      apiBaseUrl: configured ? 'https://licensed.example.com' : null,
      apiKey: configured ? 'key' : null,
      searchPath: '/search',
      syncPath: '/codes',
    }),
  } as AppConfigService;
}

describe('LicensedCptCodeCatalogProvider', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let fallback: NlmCodeCatalogProvider;
  let fallbackStreamSpy: jest.SpiedFunction<
    NlmCodeCatalogProvider['streamCptCodes']
  >;

  const jsonResponse = <T>(payload: T): Response =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  beforeEach(() => {
    fetchMock = jest.fn<typeof fetch>();
    global.fetch = fetchMock;
    fallback = new NlmCodeCatalogProvider({} as never);
    fallbackStreamSpy = jest
      .spyOn(fallback, 'streamCptCodes')
      .mockResolvedValue(FALLBACK_OUTCOME);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('getCatalogSource', () => {
    it('claims the licensed upstream when it is configured', () => {
      const provider = new LicensedCptCodeCatalogProvider(
        mockConfig(true),
        fallback,
      );

      expect(provider.getCatalogSource()).toBe('LICENSED');
    });

    it('does not claim the licensed upstream when it has no credentials', () => {
      const provider = new LicensedCptCodeCatalogProvider(
        mockConfig(false),
        fallback,
      );

      // It serves NLM data in this state, so rows must not say LICENSED.
      expect(provider.getCatalogSource()).toBe('NLM');
    });
  });

  describe('streamCptCodes', () => {
    it('reports a complete run when the whole cursor chain is walked', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            items: [{ code: '99213', description: 'Office visit' }],
            nextCursor: 'page-2',
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            items: [{ code: '93000', description: 'Electrocardiogram' }],
            nextCursor: null,
          }),
        );

      const provider = new LicensedCptCodeCatalogProvider(
        mockConfig(true),
        fallback,
      );
      const received: string[] = [];
      const outcome = await provider.streamCptCodes(async (batch) => {
        batch.forEach((code) => received.push(code.code));
      });

      expect(received).toEqual(['99213', '93000']);
      expect(outcome.completed).toBe(true);
      expect(outcome.codesStreamed).toBe(2);
      expect(outcome.unitsSkipped).toBe(0);
      expect(outcome.source).toBe('LICENSED');
      expect(fallbackStreamSpy).not.toHaveBeenCalled();
    });

    /**
     * The defect this item exists for: falling back to a different upstream
     * after pages were already written mixed two sources into one run and the
     * caller still saw a normal return.
     */
    it('reports an incomplete run when it falls back after writing pages', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            items: [{ code: '99213', description: 'Office visit' }],
            nextCursor: 'page-2',
          }),
        )
        .mockRejectedValueOnce(new Error('licensed feed died'));

      const provider = new LicensedCptCodeCatalogProvider(
        mockConfig(true),
        fallback,
      );
      const received: string[] = [];
      const outcome = await provider.streamCptCodes(async (batch) => {
        batch.forEach((code) => received.push(code.code));
      });

      // The licensed page landed before the feed died.
      expect(received).toEqual(['99213']);
      // One licensed page plus a fallback stream is not a licensed snapshot.
      expect(outcome.completed).toBe(false);
      expect(outcome.unitsSkipped).toBeGreaterThan(0);
      expect(outcome.failure).toBe('licensed feed died');
      expect(outcome.source).toBe('LICENSED->NLM');
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('reports a complete fallback when nothing was written before failing', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      fetchMock.mockRejectedValue(new Error('licensed feed unreachable'));

      const provider = new LicensedCptCodeCatalogProvider(
        mockConfig(true),
        fallback,
      );
      const outcome = await provider.streamCptCodes(async () => {});

      // No licensed page landed, so the run really is just the NLM stream.
      expect(outcome.completed).toBe(true);
      expect(outcome.source).toBe('NLM');
      expect(outcome.failure).toBe('licensed feed unreachable');

      warnSpy.mockRestore();
    });

    it('delegates to NLM when the licensed feed is not configured', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      const provider = new LicensedCptCodeCatalogProvider(
        mockConfig(false),
        fallback,
      );
      const outcome = await provider.streamCptCodes(async () => {});

      expect(fallbackStreamSpy).toHaveBeenCalled();
      expect(outcome).toEqual(FALLBACK_OUTCOME);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
