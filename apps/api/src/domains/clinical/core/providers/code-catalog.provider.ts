import { CptCode, IcdCode } from '@workspace/db';

export interface CodeCatalogProvider {
  searchIcdCodes(query: string): Promise<IcdCode[]>;
  searchCptCodes(query: string): Promise<CptCode[]>;
  streamIcdCodes(onBatch: (batch: IcdCode[]) => Promise<void>): Promise<void>;
  streamCptCodes(onBatch: (batch: CptCode[]) => Promise<void>): Promise<void>;
}

export const CODE_CATALOG_PROVIDER = Symbol('CODE_CATALOG_PROVIDER');
