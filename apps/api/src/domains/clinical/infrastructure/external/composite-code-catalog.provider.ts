import { Injectable } from '@nestjs/common';
import { CptCode, IcdCode } from '@workspace/db';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { LicensedCptCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/licensed-cpt-code-catalog.provider';
import { NlmCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/nlm-code-catalog.provider';

type CptSource = 'nlm_hcpcs' | 'licensed';

@Injectable()
export class CompositeCodeCatalogProvider implements CodeCatalogProvider {
  private readonly cptSource: CptSource =
    process.env.CPT_CATALOG_SOURCE?.toLowerCase() === 'licensed'
      ? 'licensed'
      : 'nlm_hcpcs';

  constructor(
    private readonly nlmProvider: NlmCodeCatalogProvider,
    private readonly licensedProvider: LicensedCptCodeCatalogProvider,
  ) {}

  private get cptProvider(): CodeCatalogProvider {
    return this.cptSource === 'licensed'
      ? this.licensedProvider
      : this.nlmProvider;
  }

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return this.nlmProvider.searchIcdCodes(query);
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    return this.cptProvider.searchCptCodes(query);
  }

  async streamIcdCodes(
    onBatch: (batch: IcdCode[]) => Promise<void>,
  ): Promise<void> {
    return this.nlmProvider.streamIcdCodes(onBatch);
  }

  async streamCptCodes(
    onBatch: (batch: CptCode[]) => Promise<void>,
  ): Promise<void> {
    return this.cptProvider.streamCptCodes(onBatch);
  }
}
