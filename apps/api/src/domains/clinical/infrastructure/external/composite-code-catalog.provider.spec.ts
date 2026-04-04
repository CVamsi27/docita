import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { CptCode, IcdCode } from '@workspace/db';
import { LicensedCptCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/licensed-cpt-code-catalog.provider';
import { NlmCodingService } from '@/domains/clinical/infrastructure/external/nlm-coding.service';
import { NlmCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/nlm-code-catalog.provider';
import { CompositeCodeCatalogProvider } from './composite-code-catalog.provider';

describe('CompositeCodeCatalogProvider', () => {
  const originalSource = process.env.CPT_CATALOG_SOURCE;
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

  const nlmCodingService = new NlmCodingService();
  const nlmProvider = new NlmCodeCatalogProvider(nlmCodingService);
  const licensedProvider = new LicensedCptCodeCatalogProvider(nlmProvider);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CPT_CATALOG_SOURCE = undefined;
  });

  it('uses NLM provider by default for CPT operations', async () => {
    const searchCptCodesMock = jest
      .spyOn(nlmProvider, 'searchCptCodes')
      .mockResolvedValue([buildCpt('99213')]);
    const fetchAllCptCodesMock = jest
      .spyOn(nlmProvider, 'fetchAllCptCodesForSync')
      .mockResolvedValue([buildCpt('99213')]);
    const licensedSearchCptSpy = jest.spyOn(licensedProvider, 'searchCptCodes');

    const provider = new CompositeCodeCatalogProvider(
      nlmProvider,
      licensedProvider,
    );

    await provider.searchCptCodes('office');
    await provider.fetchAllCptCodesForSync();

    expect(searchCptCodesMock).toHaveBeenCalled();
    expect(fetchAllCptCodesMock).toHaveBeenCalled();
    expect(licensedSearchCptSpy).not.toHaveBeenCalled();
  });

  it('uses licensed provider for CPT operations when configured', async () => {
    process.env.CPT_CATALOG_SOURCE = 'licensed';
    const licensedSearchCptMock = jest
      .spyOn(licensedProvider, 'searchCptCodes')
      .mockResolvedValue([buildCpt('99213')]);
    const licensedFetchAllCptMock = jest
      .spyOn(licensedProvider, 'fetchAllCptCodesForSync')
      .mockResolvedValue([buildCpt('99213')]);
    const nlmSearchCptSpy = jest.spyOn(nlmProvider, 'searchCptCodes');

    const provider = new CompositeCodeCatalogProvider(
      nlmProvider,
      licensedProvider,
    );

    await provider.searchCptCodes('office');
    await provider.fetchAllCptCodesForSync();

    expect(licensedSearchCptMock).toHaveBeenCalled();
    expect(licensedFetchAllCptMock).toHaveBeenCalled();
    expect(nlmSearchCptSpy).not.toHaveBeenCalled();
  });

  it('always uses NLM provider for ICD operations', async () => {
    process.env.CPT_CATALOG_SOURCE = 'licensed';
    const nlmSearchIcdMock = jest
      .spyOn(nlmProvider, 'searchIcdCodes')
      .mockResolvedValue([buildIcd('E11.9')]);
    const nlmFetchAllIcdMock = jest
      .spyOn(nlmProvider, 'fetchAllIcdCodesForSync')
      .mockResolvedValue([buildIcd('E11.9')]);
    const licensedSearchIcdSpy = jest.spyOn(licensedProvider, 'searchIcdCodes');

    const provider = new CompositeCodeCatalogProvider(
      nlmProvider,
      licensedProvider,
    );

    await provider.searchIcdCodes('diabetes');
    await provider.fetchAllIcdCodesForSync();

    expect(nlmSearchIcdMock).toHaveBeenCalled();
    expect(nlmFetchAllIcdMock).toHaveBeenCalled();
    expect(licensedSearchIcdSpy).not.toHaveBeenCalled();
  });

  afterAll(() => {
    process.env.CPT_CATALOG_SOURCE = originalSource;
  });
});
