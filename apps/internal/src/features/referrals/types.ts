import type { ReferrerType } from "./lib/referrer-form-helpers";

/**
 * The subset of `GET /api/internal/referrers` rows this feature consumes.
 * The API returns the full Prisma row; only these fields are used by the
 * page, the edit dialog, and the messages drawer.
 */
export interface Referral {
  id: string;
  type: ReferrerType;
  name: string;
  email?: string | null;
  phone?: string | null;
  code?: string | null;
  active: boolean;
  createdAt: string;
}
