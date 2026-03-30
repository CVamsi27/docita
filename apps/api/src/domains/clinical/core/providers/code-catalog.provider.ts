import { CptCode, IcdCode } from '@workspace/db';

export interface CodeCatalogProvider {
  searchIcdCodes(query: string): Promise<IcdCode[]>;
  searchCptCodes(query: string): Promise<CptCode[]>;
  fetchAllIcdCodesForSync(): Promise<IcdCode[]>;
  fetchAllCptCodesForSync(): Promise<CptCode[]>;
}

export const CODE_CATALOG_PROVIDER = Symbol('CODE_CATALOG_PROVIDER');
