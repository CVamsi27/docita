import { Injectable, Logger } from '@nestjs/common';
import { CptCode, IcdCode } from '@workspace/db';
import { z } from 'zod';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { NlmCodeCatalogProvider } from '@/domains/clinical/infrastructure/external/nlm-code-catalog.provider';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

const licensedCodeRecordSchema = z
  .object({
    code: z.string(),
    description: z.string(),
    category: z.string().optional(),
    price: z.number().optional(),
  })
  .strict();

const licensedCatalogResponseObjectSchema = z
  .object({
    items: z.array(licensedCodeRecordSchema).optional(),
    data: z.array(licensedCodeRecordSchema).optional(),
    nextCursor: z.string().nullable().optional(),
  })
  .strict();
const licensedCatalogResponseSchema = z.union([
  z.array(licensedCodeRecordSchema),
  licensedCatalogResponseObjectSchema,
]);

type LicensedCodeRecord = z.infer<typeof licensedCodeRecordSchema>;
type LicensedCatalogResponse =
  | z.infer<typeof licensedCatalogResponseObjectSchema>
  | LicensedCodeRecord[];

const LICENSED_CPT_SYNC_PAGE_SIZE = 1000;
const LICENSED_CPT_REQUEST_TIMEOUT_MS = 8000;

@Injectable()
export class LicensedCptCodeCatalogProvider implements CodeCatalogProvider {
  private readonly logger = new Logger(LicensedCptCodeCatalogProvider.name);
  private readonly apiBaseUrl: string | null;
  private readonly apiKey: string | null;
  private readonly searchPath: string;
  private readonly syncPath: string;
  private missingConfigWarned = false;

  constructor(
    config: AppConfigService,
    private readonly fallbackProvider: NlmCodeCatalogProvider,
  ) {
    const licensed = config.getCptLicensedApiConfig();
    this.apiBaseUrl = licensed.apiBaseUrl;
    this.apiKey = licensed.apiKey;
    this.searchPath = licensed.searchPath;
    this.syncPath = licensed.syncPath;
  }

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

  private extractItems(payload: LicensedCatalogResponse): LicensedCodeRecord[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }

  private extractNextCursor(payload: LicensedCatalogResponse): string | null {
    if (Array.isArray(payload)) return null;
    const cursor = payload.nextCursor;
    return typeof cursor === 'string' && cursor.trim() ? cursor : null;
  }

  private async fetchLicensed<T>(
    path: string,
    params: Record<string, string | undefined>,
    mapper: (payload: LicensedCatalogResponse) => T,
  ): Promise<T> {
    const baseUrl = this.apiBaseUrl;
    if (!baseUrl)
      throw new Error('Licensed CPT API base URL is not configured');
    const url = new URL(path, baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });

    const res = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      },
      LICENSED_CPT_REQUEST_TIMEOUT_MS,
    );

    if (!res.ok) {
      throw new Error(`Licensed CPT API returned HTTP ${res.status}`);
    }

    const payload = licensedCatalogResponseSchema.parse(await res.json());
    return mapper(payload);
  }

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return this.fallbackProvider.searchIcdCodes(query);
  }

  async streamIcdCodes(
    onBatch: (batch: IcdCode[]) => Promise<void>,
  ): Promise<void> {
    return this.fallbackProvider.streamIcdCodes(onBatch);
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

  async streamCptCodes(
    onBatch: (batch: CptCode[]) => Promise<void>,
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.warnMissingConfig();
      return this.fallbackProvider.streamCptCodes(onBatch);
    }

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

        const batch = page.items
          .filter((row) => !!row.code && !!row.description)
          .map((row) => this.mapCpt(row, true));

        if (batch.length > 0) {
          await onBatch(batch);
        }

        cursor = page.nextCursor;
      } while (cursor);
    } catch (error) {
      this.logger.warn(
        `Licensed CPT sync failed: ${error instanceof Error ? error.message : String(error)}. Falling back to NLM/HCPCS provider.`,
      );
      return this.fallbackProvider.streamCptCodes(onBatch);
    }
  }
}
