import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { IcdCode, CptCode } from '@workspace/db';
import { getAllCPTCodes } from '@workspace/utils';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

type CodeSystem = 'ICD' | 'HCPCS';
type NlmCodeRow = { code: string; description: string };

const ICD_CATEGORY_MAP: Record<string, string> = {
  A: 'Infectious Diseases',
  B: 'Infectious Diseases',
  C: 'Neoplasms',
  D: 'Neoplasms',
  E: 'Endocrine',
  F: 'Mental Health',
  G: 'Nervous System',
  H: 'Eye and Ear',
  I: 'Circulatory',
  J: 'Respiratory',
  K: 'Digestive',
  L: 'Skin',
  M: 'Musculoskeletal',
  N: 'Genitourinary',
  O: 'Pregnancy',
  P: 'Perinatal',
  Q: 'Congenital',
  R: 'Symptoms',
  S: 'Injury',
  T: 'Injury',
  V: 'External Causes',
  W: 'External Causes',
  X: 'External Causes',
  Y: 'External Causes',
  Z: 'Health Factors',
};

const NLM_ICD_URL = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';
const NLM_HCPCS_URL = 'https://clinicaltables.nlm.nih.gov/api/hcpcs/v3/search';
const NLM_ICD_REQUEST_TIMEOUT_MS = 5000;
const NLM_HCPCS_REQUEST_TIMEOUT_MS = 5000;
const NLM_SYNC_REQUEST_TIMEOUT_MS = 15000;
const NLM_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
const NLM_SYNC_PAGE_SIZE = 500;
const NLM_SYNC_MAX_OFFSET = 7500;
const ICD_SYNC_PREFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const HCPCS_SYNC_PREFIXES = 'ABCDEFGHIJKLMNOPQRSTUV'.split('');
const ACTIVE_HCPCS_FILTER = 'obsolete:false';

const SYNTHETIC_DATE = new Date(0);

function cptCategory(code: string): string {
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

@Injectable()
export class NlmCodingClient {
  private readonly logger = new Logger(NlmCodingClient.name);
  private icdSearchDisabledUntil = 0;
  private hcpcsSearchDisabledUntil = 0;

  constructor(@Inject(CLOCK_PORT) private readonly clock: IClock) {}

  private getDisabledUntil(system: CodeSystem): number {
    return system === 'ICD'
      ? this.icdSearchDisabledUntil
      : this.hcpcsSearchDisabledUntil;
  }

  private setDisabledUntil(system: CodeSystem, until: number): void {
    if (system === 'ICD') {
      this.icdSearchDisabledUntil = until;
      return;
    }

    this.hcpcsSearchDisabledUntil = until;
  }

  private isSearchTemporarilyDisabled(
    system: CodeSystem,
    nowMs: number = this.clock.now().getTime(),
  ): boolean {
    return nowMs < this.getDisabledUntil(system);
  }

  private clearSearchUnavailable(system: CodeSystem): void {
    this.setDisabledUntil(system, 0);
  }

  private markSearchUnavailable(system: CodeSystem, reason: string): void {
    const now = this.clock.now().getTime();
    if (this.isSearchTemporarilyDisabled(system, now)) {
      return;
    }

    this.setDisabledUntil(system, now + NLM_FAILURE_COOLDOWN_MS);

    this.logger.warn(
      `NLM ${system} lookup unavailable (${reason}). Skipping remote ${system} lookups for ${Math.round(
        NLM_FAILURE_COOLDOWN_MS / 60000,
      )} minutes.`,
    );
  }

  private toNlmRows(data: unknown): NlmCodeRow[] {
    if (!Array.isArray(data)) {
      return [];
    }

    const codes = Array.isArray(data[1])
      ? data[1].filter((code): code is string => typeof code === 'string')
      : [];
    const displayRows = Array.isArray(data[3]) ? data[3] : [];

    return codes
      .map((code, idx) => {
        const rawRow = displayRows[idx];
        const row = Array.isArray(rawRow)
          ? rawRow.filter((cell): cell is string => typeof cell === 'string')
          : [];
        const description =
          row.find((value, rowIndex) => rowIndex > 0 && value)?.trim() ??
          row[1]?.trim() ??
          '';
        return { code: code.trim(), description };
      })
      .filter((row) => !!row.code);
  }

  private async fetchNlmRows(
    system: CodeSystem,
    endpoint: string,
    searchParams: Record<string, string>,
    timeoutMs: number,
  ): Promise<{ total: number; rows: NlmCodeRow[] }> {
    const url = new URL(endpoint);
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }

    const res = await fetchWithTimeout(url.toString(), {}, timeoutMs);

    if (!res.ok) {
      throw new Error(`${system} API returned HTTP ${res.status}`);
    }

    const data: unknown = await res.json();
    return {
      total: Array.isArray(data) && typeof data[0] === 'number' ? data[0] : 0,
      rows: this.toNlmRows(data),
    };
  }

  private mapIcd(
    code: string,
    description: string,
    isCommon: boolean,
  ): IcdCode {
    return {
      id: code,
      code,
      description,
      category: ICD_CATEGORY_MAP[code[0].toUpperCase()] ?? 'Other',
      version: 'ICD-10',
      isCommon,
      createdAt: SYNTHETIC_DATE,
      updatedAt: SYNTHETIC_DATE,
    };
  }

  private mapCpt(
    code: string,
    description: string,
    isCommon: boolean,
  ): CptCode {
    return {
      id: code,
      code,
      description,
      category: cptCategory(code),
      isCommon,
      price: 0,
      createdAt: SYNTHETIC_DATE,
      updatedAt: SYNTHETIC_DATE,
    };
  }

  private async streamByPrefix<T>(
    system: CodeSystem,
    endpoint: string,
    prefixes: string[],
    params: { sf: string; df: string; q?: string },
    timeoutMs: number,
    mapper: (code: string, description: string) => T,
    onBatch: (batch: T[]) => Promise<void>,
  ): Promise<void> {
    for (const prefix of prefixes) {
      if (this.isSearchTemporarilyDisabled(system)) {
        break;
      }

      let offset = 0;

      while (offset < NLM_SYNC_MAX_OFFSET) {
        let total = 0;
        let rows: NlmCodeRow[] = [];

        try {
          ({ total, rows } = await this.fetchNlmRows(
            system,
            endpoint,
            {
              terms: prefix,
              sf: params.sf,
              df: params.df,
              count: String(NLM_SYNC_PAGE_SIZE),
              offset: String(offset),
              ...(params.q ? { q: params.q } : {}),
            },
            timeoutMs,
          ));
        } catch (err) {
          this.markSearchUnavailable(
            system,
            err instanceof Error ? err.message : String(err),
          );
          return;
        }

        if (rows.length === 0) {
          break;
        }

        await onBatch(rows.map((row) => mapper(row.code, row.description)));

        offset += rows.length;

        if (rows.length < NLM_SYNC_PAGE_SIZE) break;
        if (total > 0 && offset >= total) break;
      }
    }
  }

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    if (!query?.trim()) return [];
    if (this.isSearchTemporarilyDisabled('ICD')) return [];

    try {
      const { rows } = await this.fetchNlmRows(
        'ICD',
        NLM_ICD_URL,
        {
          terms: query.trim(),
          sf: 'code,name',
          df: 'code,name',
          maxList: '20',
        },
        NLM_ICD_REQUEST_TIMEOUT_MS,
      );
      this.clearSearchUnavailable('ICD');
      return rows.map((row) => this.mapIcd(row.code, row.description, false));
    } catch (err) {
      this.markSearchUnavailable(
        'ICD',
        err instanceof Error ? err.message : String(err),
      );
      return [];
    }
  }

  private searchLocalCptCodes(query: string): CptCode[] {
    const lowerQuery = query.trim().toLowerCase();
    return getAllCPTCodes()
      .filter(
        (code) =>
          code.code.toLowerCase().includes(lowerQuery) ||
          code.description.toLowerCase().includes(lowerQuery) ||
          code.category.toLowerCase().includes(lowerQuery),
      )
      .map((code) => this.mapCpt(code.code, code.description, false));
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    if (!query?.trim()) return [];

    if (!this.isSearchTemporarilyDisabled('HCPCS')) {
      try {
        const { rows } = await this.fetchNlmRows(
          'HCPCS',
          NLM_HCPCS_URL,
          {
            terms: query.trim(),
            sf: 'code,short_desc,long_desc',
            df: 'code,display',
            maxList: '20',
            q: ACTIVE_HCPCS_FILTER,
          },
          NLM_HCPCS_REQUEST_TIMEOUT_MS,
        );
        this.clearSearchUnavailable('HCPCS');
        return rows.map((row) => this.mapCpt(row.code, row.description, false));
      } catch (err) {
        this.markSearchUnavailable(
          'HCPCS',
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    return this.searchLocalCptCodes(query);
  }

  async streamIcdCodes(
    onBatch: (batch: IcdCode[]) => Promise<void>,
  ): Promise<void> {
    await this.streamByPrefix(
      'ICD',
      NLM_ICD_URL,
      ICD_SYNC_PREFIXES,
      { sf: 'code', df: 'code,name' },
      NLM_SYNC_REQUEST_TIMEOUT_MS,
      (code, description) => this.mapIcd(code, description, true),
      onBatch,
    );
  }

  async streamCptCodes(
    onBatch: (batch: CptCode[]) => Promise<void>,
  ): Promise<void> {
    await this.streamByPrefix(
      'HCPCS',
      NLM_HCPCS_URL,
      HCPCS_SYNC_PREFIXES,
      { sf: 'code', df: 'code,display', q: ACTIVE_HCPCS_FILTER },
      NLM_SYNC_REQUEST_TIMEOUT_MS,
      (code, description) => this.mapCpt(code, description, true),
      onBatch,
    );
  }
}
