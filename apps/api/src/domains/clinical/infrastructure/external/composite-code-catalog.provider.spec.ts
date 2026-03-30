import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { CompositeCodeCatalogProvider } from './composite-code-catalog.provider';

describe('CompositeCodeCatalogProvider', () => {
  const originalSource = process.env.CPT_CATALOG_SOURCE;

  const nlmProvider = {
    searchIcdCodes: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    searchCptCodes: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    fetchAllIcdCodesForSync:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    fetchAllCptCodesForSync:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const licensedProvider = {
    searchIcdCodes: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    searchCptCodes: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    fetchAllIcdCodesForSync:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    fetchAllCptCodesForSync:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CPT_CATALOG_SOURCE = undefined;
  });

  it('uses NLM provider by default for CPT operations', async () => {
    nlmProvider.searchCptCodes.mockResolvedValue([{ code: '99213' }] as never);
    nlmProvider.fetchAllCptCodesForSync.mockResolvedValue([
      { code: '99213' },
    ] as never);

    const provider = new CompositeCodeCatalogProvider(
      nlmProvider as never,
      licensedProvider as never,
    );

    await provider.searchCptCodes('office');
    await provider.fetchAllCptCodesForSync();

    expect(nlmProvider.searchCptCodes).toHaveBeenCalled();
    expect(nlmProvider.fetchAllCptCodesForSync).toHaveBeenCalled();
    expect(licensedProvider.searchCptCodes).not.toHaveBeenCalled();
  });

  it('uses licensed provider for CPT operations when configured', async () => {
    process.env.CPT_CATALOG_SOURCE = 'licensed';
    licensedProvider.searchCptCodes.mockResolvedValue([
      { code: '99213' },
    ] as never);
    licensedProvider.fetchAllCptCodesForSync.mockResolvedValue([
      { code: '99213' },
    ] as never);

    const provider = new CompositeCodeCatalogProvider(
      nlmProvider as never,
      licensedProvider as never,
    );

    await provider.searchCptCodes('office');
    await provider.fetchAllCptCodesForSync();

    expect(licensedProvider.searchCptCodes).toHaveBeenCalled();
    expect(licensedProvider.fetchAllCptCodesForSync).toHaveBeenCalled();
    expect(nlmProvider.searchCptCodes).not.toHaveBeenCalled();
  });

  it('always uses NLM provider for ICD operations', async () => {
    process.env.CPT_CATALOG_SOURCE = 'licensed';
    nlmProvider.searchIcdCodes.mockResolvedValue([{ code: 'E11.9' }] as never);
    nlmProvider.fetchAllIcdCodesForSync.mockResolvedValue([
      { code: 'E11.9' },
    ] as never);

    const provider = new CompositeCodeCatalogProvider(
      nlmProvider as never,
      licensedProvider as never,
    );

    await provider.searchIcdCodes('diabetes');
    await provider.fetchAllIcdCodesForSync();

    expect(nlmProvider.searchIcdCodes).toHaveBeenCalled();
    expect(nlmProvider.fetchAllIcdCodesForSync).toHaveBeenCalled();
    expect(licensedProvider.searchIcdCodes).not.toHaveBeenCalled();
  });

  afterAll(() => {
    process.env.CPT_CATALOG_SOURCE = originalSource;
  });
});
