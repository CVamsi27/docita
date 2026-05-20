import { Injectable } from '@nestjs/common';
import { CptCode, IcdCode } from '@workspace/db';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { LicensedCptCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/licensed-cpt-code-catalog.provider';
import { NlmCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/nlm-code-catalog.provider';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

type CptCatalogSource = ReturnType<AppConfigService['getCptCatalogSource']>;

@Injectable()
export class CompositeCodeCatalogProvider implements CodeCatalogProvider {
  private readonly cptProviders: ReadonlyMap<
    CptCatalogSource,
    CodeCatalogProvider
  >;

  constructor(
    private readonly config: AppConfigService,
    private readonly nlmProvider: NlmCodeCatalogProvider,
    private readonly licensedProvider: LicensedCptCodeCatalogProvider,
  ) {
    this.cptProviders = new Map<CptCatalogSource, CodeCatalogProvider>([
      ['nlm_hcpcs', nlmProvider],
      ['licensed', licensedProvider],
    ]);
  }

  private resolveCptProvider(): CodeCatalogProvider {
    const source = this.config.getCptCatalogSource();
    return this.cptProviders.get(source) ?? this.nlmProvider;
  }

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return this.nlmProvider.searchIcdCodes(query);
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    return this.resolveCptProvider().searchCptCodes(query);
  }

  async streamIcdCodes(
    onBatch: (batch: IcdCode[]) => Promise<void>,
  ): Promise<void> {
    return this.nlmProvider.streamIcdCodes(onBatch);
  }

  async streamCptCodes(
    onBatch: (batch: CptCode[]) => Promise<void>,
  ): Promise<void> {
    return this.resolveCptProvider().streamCptCodes(onBatch);
  }
}
