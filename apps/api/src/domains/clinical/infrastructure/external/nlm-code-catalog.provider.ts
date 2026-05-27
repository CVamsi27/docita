import { Injectable } from '@nestjs/common';
import { CptCode, IcdCode } from '@workspace/db';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { NlmCodingClient } from '@/domains/clinical/infrastructure/external/nlm-coding.client';

@Injectable()
export class NlmCodeCatalogProvider implements CodeCatalogProvider {
  constructor(private readonly nlmCodingClient: NlmCodingClient) {}

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return this.nlmCodingClient.searchIcdCodes(query);
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    return this.nlmCodingClient.searchCptCodes(query);
  }

  async streamIcdCodes(
    onBatch: (batch: IcdCode[]) => Promise<void>,
  ): Promise<void> {
    return this.nlmCodingClient.streamIcdCodes(onBatch);
  }

  async streamCptCodes(
    onBatch: (batch: CptCode[]) => Promise<void>,
  ): Promise<void> {
    return this.nlmCodingClient.streamCptCodes(onBatch);
  }
}
