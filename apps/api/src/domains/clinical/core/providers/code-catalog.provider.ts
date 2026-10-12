import { CptCode, IcdCode, CodeCatalogSystem } from '@workspace/db';

/**
 * What one catalog stream actually delivered.
 *
 * The stream contract used to return `void`, so a run that died halfway through
 * a prefix and a run that covered every prefix were indistinguishable — the sync
 * reported a code count either way and nothing downstream could tell a partial
 * catalog from a complete one. `completed` is the field that closes that gap.
 */
export interface CodeStreamOutcome {
  /** True only when every unit the provider intended to stream was streamed. */
  completed: boolean;
  /** Codes handed to the consumer, including duplicates across units. */
  codesStreamed: number;
  /**
   * Units (letter prefixes for NLM, pages for a licensed feed) that were never
   * fetched. Zero on a clean run; the reason a run is TRUNCATED.
   */
  unitsSkipped: number;
  /** Last unit successfully streamed, for resuming and for the run record. */
  lastUnit: string | null;
  /** Why the stream stopped early, when it did. */
  failure?: string;
  /** Identifier of the upstream that produced these codes. */
  source: string;
}

export interface CodeCatalogProvider {
  searchIcdCodes(query: string): Promise<IcdCode[]>;
  searchCptCodes(query: string): Promise<CptCode[]>;
  streamIcdCodes(
    onBatch: (batch: IcdCode[]) => Promise<void>,
  ): Promise<CodeStreamOutcome>;
  streamCptCodes(
    onBatch: (batch: CptCode[]) => Promise<void>,
  ): Promise<CodeStreamOutcome>;
  /**
   * Which upstream would serve this system right now. Resolvable before a
   * stream starts, because every code row has to record its source at write
   * time rather than after the run finishes.
   */
  getCatalogSource(system: CodeCatalogSystem): string;
}

export const CODE_CATALOG_PROVIDER = Symbol('CODE_CATALOG_PROVIDER');
