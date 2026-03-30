import { Injectable } from '@nestjs/common';
import { CptCode, IcdCode } from '@workspace/db';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { NlmCodingService } from '@/domains/clinical/infrastructure/external/nlm-coding.service';

@Injectable()
export class NlmCodeCatalogProvider implements CodeCatalogProvider {
  constructor(private readonly nlmCodingService: NlmCodingService) {}

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return this.nlmCodingService.searchIcdCodes(query);
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    return this.nlmCodingService.searchCptCodes(query);
  }

  async fetchAllIcdCodesForSync(): Promise<IcdCode[]> {
    return this.nlmCodingService.fetchAllIcdCodesForSync();
  }

  async fetchAllCptCodesForSync(): Promise<CptCode[]> {
    return this.nlmCodingService.fetchAllCptCodesForSync();
  }
}
