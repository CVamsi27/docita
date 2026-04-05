import { Injectable, Logger } from '@nestjs/common';
import { CptCode, IcdCode } from '@workspace/db';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { NlmCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/nlm-code-catalog.provider';

interface LicensedCodeRecord {
  code: string;
  description: string;
  category?: string;
  price?: number;
}

interface LicensedCatalogResponse {
  items?: LicensedCodeRecord[];
  data?: LicensedCodeRecord[];
  nextCursor?: string | null;
}

const LICENSED_CPT_SYNC_PAGE_SIZE = 1000;
const LICENSED_CPT_REQUEST_TIMEOUT_MS = 8000;

@Injectable()
export class LicensedCptCodeCatalogProvider implements CodeCatalogProvider {
  private readonly logger = new Logger(LicensedCptCodeCatalogProvider.name);
  private readonly apiBaseUrl =
    process.env.CPT_LICENSED_API_URL?.trim() || null;
  private readonly apiKey = process.env.CPT_LICENSED_API_KEY?.trim() || null;
  private readonly searchPath =
    process.env.CPT_LICENSED_SEARCH_PATH?.trim() || '/search';
  private readonly syncPath =
    process.env.CPT_LICENSED_SYNC_PATH?.trim() || '/codes';
  private missingConfigWarned = false;

  constructor(private readonly fallbackProvider: NlmCodeCatalogProvider) {}

  private isConfigured(): boolean {
    return !!this.apiBaseUrl && !!this.apiKey;
  }

  private warnMissingConfig(): void {
    if (this.missingConfigWarned) return;
    this.missingConfigWarned = true;
    this.logger.warn(
      'Licensed CPT provider enabled but CPT_LICENSED_API_URL/CPT_LICENSED_API_KEY is missing. Falling back to NLM/HCPCS provider.',
    );
  }

  private cptCategory(code: string, category?: string): string {
    if (category?.trim()) return category.trim();
    if (/^[A-Z]/i.test(code)) return 'HCPCS';
    const num = parseInt(code, 10);
    if (!Number.isFinite(num)) return 'Other';
    if (num >= 99201 && num <= 99499) return 'Evaluation and Management';
    if (num >= 10004 && num <= 69990) return 'Surgery';
    if (num >= 70010 && num <= 79999) return 'Radiology';
    if (num >= 80047 && num <= 89398) return 'Laboratory';
    if (num >= 90281 && num <= 99199) return 'Medicine';
    if (num >= 100 && num <= 1999) return 'Anesthesia';
    return 'Other';
  }

  private mapCpt(record: LicensedCodeRecord, isCommon: boolean): CptCode {
    const code = record.code.trim();
    return {
      id: code,
      code,
      description: record.description.trim(),
      category: this.cptCategory(code, record.category),
      isCommon,
      price: record.price ?? 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }

  private extractItems(payload: unknown): LicensedCodeRecord[] {
    if (Array.isArray(payload)) return payload as LicensedCodeRecord[];
    if (!payload || typeof payload !== 'object') return [];
    const typed = payload as LicensedCatalogResponse;
    if (Array.isArray(typed.items)) return typed.items;
    if (Array.isArray(typed.data)) return typed.data;
    return [];
  }

  private extractNextCursor(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const cursor = (payload as LicensedCatalogResponse).nextCursor;
    return typeof cursor === 'string' && cursor.trim() ? cursor : null;
  }

  private async fetchLicensed<T>(
    path: string,
    params: Record<string, string | undefined>,
    mapper: (payload: unknown) => T,
  ): Promise<T> {
    const url = new URL(path, this.apiBaseUrl as string);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(LICENSED_CPT_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`Licensed CPT API returned HTTP ${res.status}`);
    }

    const payload = (await res.json()) as unknown;
    return mapper(payload);
  }

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return this.fallbackProvider.searchIcdCodes(query);
  }

  async fetchAllIcdCodesForSync(): Promise<IcdCode[]> {
    return this.fallbackProvider.fetchAllIcdCodesForSync();
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    if (!this.isConfigured()) {
      this.warnMissingConfig();
      return this.fallbackProvider.searchCptCodes(query);
    }

    try {
      const rows = await this.fetchLicensed<LicensedCodeRecord[]>(
        this.searchPath,
        { q: query, limit: '20' },
        (payload) => this.extractItems(payload),
      );

      return rows
        .filter((row) => !!row.code && !!row.description)
        .map((row) => this.mapCpt(row, false));
    } catch (error) {
      this.logger.warn(
        `Licensed CPT search failed: ${error instanceof Error ? error.message : String(error)}. Falling back to NLM/HCPCS provider.`,
      );
      return this.fallbackProvider.searchCptCodes(query);
    }
  }

  async fetchAllCptCodesForSync(): Promise<CptCode[]> {
    if (!this.isConfigured()) {
      this.warnMissingConfig();
      return this.fallbackProvider.fetchAllCptCodesForSync();
    }

    const results: CptCode[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;

    try {
      do {
        const page: { items: LicensedCodeRecord[]; nextCursor: string | null } =
          await this.fetchLicensed<{
            items: LicensedCodeRecord[];
            nextCursor: string | null;
          }>(
            this.syncPath,
            {
              limit: String(LICENSED_CPT_SYNC_PAGE_SIZE),
              cursor: cursor ?? undefined,
            },
            (payload) => ({
              items: this.extractItems(payload),
              nextCursor: this.extractNextCursor(payload),
            }),
          );

        for (const row of page.items) {
          if (!row.code || !row.description) continue;
          if (seen.has(row.code)) continue;
          seen.add(row.code);
          results.push(this.mapCpt(row, true));
        }

        cursor = page.nextCursor;
      } while (cursor);

      return results;
    } catch (error) {
      this.logger.warn(
        `Licensed CPT sync failed: ${error instanceof Error ? error.message : String(error)}. Falling back to NLM/HCPCS provider.`,
      );
      return this.fallbackProvider.fetchAllCptCodesForSync();
    }
  }
}
