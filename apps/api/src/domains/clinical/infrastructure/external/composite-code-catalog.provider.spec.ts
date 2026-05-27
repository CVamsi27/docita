import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CptCode, IcdCode } from '@workspace/db';
import { LicensedCptCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/licensed-cpt-code-catalog.provider';
import { NlmCodingClient } from '@/domains/clinical/infrastructure/external/nlm-coding.client';
import { NlmCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/nlm-code-catalog.provider';
import { CompositeCodeCatalogProvider } from './composite-code-catalog.provider';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';

function mockAppConfig(
  cptSource: 'licensed' | 'nlm_hcpcs' = 'nlm_hcpcs',
): AppConfigService {
  return {
    getCptCatalogSource: () => cptSource,
    getCptLicensedApiConfig: () => ({
      apiBaseUrl: null,
      apiKey: null,
      searchPath: '/search',
      syncPath: '/codes',
    }),
  } as AppConfigService;
}

describe('CompositeCodeCatalogProvider', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  const buildCpt = (code: string): CptCode => ({
    id: `cpt-${code}`,
    code,
    description: `Description for ${code}`,
    category: 'Evaluation and Management',
    isCommon: true,
    price: 0,
    createdAt: now,
    updatedAt: now,
  });

  const buildIcd = (code: string): IcdCode => ({
    id: `icd-${code}`,
    code,
    description: `Description for ${code}`,
    category: 'General',
    version: 'ICD-10',
    isCommon: true,
    createdAt: now,
    updatedAt: now,
  });

  const nlmCodingClient = new NlmCodingClient({
    now: () => new Date('2026-01-15T12:00:00.000Z'),
  });
  const nlmProvider = new NlmCodeCatalogProvider(nlmCodingClient);
  const licensedProvider = new LicensedCptCodeCatalogProvider(
    mockAppConfig(),
    nlmProvider,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses NLM provider by default for CPT search', async () => {
    const searchCptCodesMock = jest
      .spyOn(nlmProvider, 'searchCptCodes')
      .mockResolvedValue([buildCpt('99213')]);
    const licensedSearchCptSpy = jest.spyOn(licensedProvider, 'searchCptCodes');

    const provider = new CompositeCodeCatalogProvider(
      mockAppConfig(),
      nlmProvider,
      licensedProvider,
    );

    await provider.searchCptCodes('office');

    expect(searchCptCodesMock).toHaveBeenCalled();
    expect(licensedSearchCptSpy).not.toHaveBeenCalled();
  });

  it('uses NLM provider by default for CPT streaming', async () => {
    const streamCptMock = jest
      .spyOn(nlmProvider, 'streamCptCodes')
      .mockResolvedValue(undefined);
    const licensedStreamCptSpy = jest.spyOn(licensedProvider, 'streamCptCodes');

    const provider = new CompositeCodeCatalogProvider(
      mockAppConfig(),
      nlmProvider,
      licensedProvider,
    );

    await provider.streamCptCodes(async () => {});

    expect(streamCptMock).toHaveBeenCalled();
    expect(licensedStreamCptSpy).not.toHaveBeenCalled();
  });

  it('uses licensed provider for CPT operations when configured', async () => {
    const licensedSearchCptMock = jest
      .spyOn(licensedProvider, 'searchCptCodes')
      .mockResolvedValue([buildCpt('99213')]);
    const licensedStreamCptMock = jest
      .spyOn(licensedProvider, 'streamCptCodes')
      .mockResolvedValue(undefined);
    const nlmSearchCptSpy = jest.spyOn(nlmProvider, 'searchCptCodes');

    const provider = new CompositeCodeCatalogProvider(
      mockAppConfig('licensed'),
      nlmProvider,
      licensedProvider,
    );

    await provider.searchCptCodes('office');
    await provider.streamCptCodes(async () => {});

    expect(licensedSearchCptMock).toHaveBeenCalled();
    expect(licensedStreamCptMock).toHaveBeenCalled();
    expect(nlmSearchCptSpy).not.toHaveBeenCalled();
  });

  it('always uses NLM provider for ICD operations', async () => {
    const nlmSearchIcdMock = jest
      .spyOn(nlmProvider, 'searchIcdCodes')
      .mockResolvedValue([buildIcd('E11.9')]);
    const nlmStreamIcdMock = jest
      .spyOn(nlmProvider, 'streamIcdCodes')
      .mockResolvedValue(undefined);
    const licensedSearchIcdSpy = jest.spyOn(licensedProvider, 'searchIcdCodes');

    const provider = new CompositeCodeCatalogProvider(
      mockAppConfig('licensed'),
      nlmProvider,
      licensedProvider,
    );

    await provider.searchIcdCodes('diabetes');
    await provider.streamIcdCodes(async () => {});

    expect(nlmSearchIcdMock).toHaveBeenCalled();
    expect(nlmStreamIcdMock).toHaveBeenCalled();
    expect(licensedSearchIcdSpy).not.toHaveBeenCalled();
  });
});
