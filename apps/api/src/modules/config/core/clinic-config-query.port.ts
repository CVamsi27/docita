import { ClinicTier } from '@workspace/db';

/**
 * Minimal read seam for the clinic rows the public /config endpoints need.
 * Keeps Prisma out of ConfigService — the persistence boundary — while the
 * legacy `modules/config` module stays self-contained (no cross-domain import).
 */
export const CLINIC_CONFIG_QUERY_TOKEN = Symbol('IClinicConfigQuery');

export interface IClinicConfigQuery {
  findAppConfigById(
    id: string,
  ): Promise<{ settings: unknown; tier: ClinicTier } | null>;
}
