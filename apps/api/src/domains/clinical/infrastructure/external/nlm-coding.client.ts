import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { IcdCode, CptCode } from '@workspace/db';
import { getAllCPTCodes } from '@workspace/utils';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import {
  type CodeSystem,
  type NlmCodeRow,
  mapCpt,
  mapIcd,
  readTotalFromNlmResponse,
  toNlmRows,
} from './nlm-coding-mappers';
import type { CodeStreamOutcome } from '@/domains/clinical/core/providers/code-catalog.provider';

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
/** Identifies this upstream in the sync run record. */
const NLM_SOURCE = 'NLM';

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
    } else {
      this.hcpcsSearchDisabledUntil = until;
    }
  }

  private isSearchTemporarilyDisabled(system: CodeSystem): boolean {
    return this.getDisabledUntil(system) > this.clock.now().getTime();
  }

  private clearSearchUnavailable(system: CodeSystem): void {
    this.setDisabledUntil(system, 0);
  }

  private markSearchUnavailable(system: CodeSystem, reason: string): void {
    const now = this.clock.now().getTime();
    if (this.isSearchTemporarilyDisabled(system)) {
      return;
    }

    this.setDisabledUntil(system, now + NLM_FAILURE_COOLDOWN_MS);

    this.logger.warn(
      `NLM ${system} lookup unavailable (${reason}). Skipping remote ${system} lookups for ${Math.round(
        NLM_FAILURE_COOLDOWN_MS / 60000,
      )} minutes.`,
    );
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
      total: readTotalFromNlmResponse(data),
      rows: toNlmRows(data),
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
  ): Promise<CodeStreamOutcome> {
    let codesStreamed = 0;
    let lastUnit: string | null = null;

    for (const prefix of prefixes) {
      // A cooled-down upstream used to `break` silently, so every remaining
      // prefix was skipped with no record. The run is now reported as
      // incomplete with those prefixes counted as skipped.
      if (this.isSearchTemporarilyDisabled(system)) {
        const skipped = prefixes.slice(prefixes.indexOf(prefix));
        return {
          completed: false,
          codesStreamed,
          unitsSkipped: skipped.length,
          lastUnit,
          failure: `${system} upstream marked unavailable`,
          source: NLM_SOURCE,
        };
      }

      let offset = 0;
      let reachedEnd = false;

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
          // Returning here used to look identical to a finished stream. The
          // remaining prefixes are now counted so the run cannot be labeled
          // complete.
          this.markSearchUnavailable(
            system,
            err instanceof Error ? err.message : String(err),
          );
          const remaining = prefixes.length - prefixes.indexOf(prefix);
          return {
            completed: false,
            codesStreamed,
            unitsSkipped: remaining,
            lastUnit,
            failure: err instanceof Error ? err.message : String(err),
            source: NLM_SOURCE,
          };
        }

        if (rows.length === 0) {
          reachedEnd = true;
          break;
        }

        await onBatch(rows.map((row) => mapper(row.code, row.description)));

        codesStreamed += rows.length;
        lastUnit = prefix;
        offset += rows.length;

        if (rows.length < NLM_SYNC_PAGE_SIZE) {
          reachedEnd = true;
          break;
        }
        if (total > 0 && offset >= total) {
          reachedEnd = true;
          break;
        }
      }

      if (!reachedEnd) {
        // The offset ceiling stopped this prefix short of its last page.
        return {
          completed: false,
          codesStreamed,
          unitsSkipped: prefixes.length - prefixes.indexOf(prefix),
          lastUnit,
          failure: `prefix ${prefix} exceeded the ${NLM_SYNC_MAX_OFFSET}-row sync ceiling`,
          source: NLM_SOURCE,
        };
      }
    }

    return {
      completed: true,
      codesStreamed,
      unitsSkipped: 0,
      lastUnit,
      source: NLM_SOURCE,
    };
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
      return rows.map((row) => mapIcd(row.code, row.description, false));
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
      .map((code) => mapCpt(code.code, code.description, false));
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
        return rows.map((row) => mapCpt(row.code, row.description, false));
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
  ): Promise<CodeStreamOutcome> {
    return this.streamByPrefix(
      'ICD',
      NLM_ICD_URL,
      ICD_SYNC_PREFIXES,
      { sf: 'code', df: 'code,name' },
      NLM_SYNC_REQUEST_TIMEOUT_MS,
      (code, description) => mapIcd(code, description, true),
      onBatch,
    );
  }

  async streamCptCodes(
    onBatch: (batch: CptCode[]) => Promise<void>,
  ): Promise<CodeStreamOutcome> {
    return this.streamByPrefix(
      'HCPCS',
      NLM_HCPCS_URL,
      HCPCS_SYNC_PREFIXES,
      { sf: 'code', df: 'code,display', q: ACTIVE_HCPCS_FILTER },
      NLM_SYNC_REQUEST_TIMEOUT_MS,
      (code, description) => mapCpt(code, description, true),
      onBatch,
    );
  }
}
