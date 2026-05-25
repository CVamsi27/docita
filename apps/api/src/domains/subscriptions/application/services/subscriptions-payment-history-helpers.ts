/** Pure helpers for payment-history normalization — no DI, no @Injectable. */

import type { PaymentHistoryRecord } from './subscription-payment-history.types';

export function normalizePaymentHistory<T extends PaymentHistoryRecord>(
  records: T[],
): T[] {
  const seenPendingKeys = new Set<string>();
  const normalized: T[] = [];

  for (const record of records) {
    const status = (
      record.status ?? String(record.getStatus?.() ?? '')
    ).toLowerCase();
    if (status === 'expired') continue;

    if (status === 'pending') {
      const key = [
        record.description ?? '',
        record.amountCents,
        record.currency,
      ].join('|');
      if (seenPendingKeys.has(key)) continue;
      seenPendingKeys.add(key);
    }

    normalized.push(record);
  }

  return normalized;
}

function isPendingLikeStatus(status: string): boolean {
  const s = status.toLowerCase().trim();
  return (
    s === 'pending' ||
    s === 'processing' ||
    s === 'created' ||
    s === 'requires_action' ||
    s === 'attempted' ||
    s === 'due'
  );
}

function isTierUpgradeSubscriptionDescription(
  description: string | null | undefined,
): boolean {
  if (!description || typeof description !== 'string') return false;
  return /\b(STARTER|ESSENTIAL|FRONT_DESK|FRONT_DESK_CLINIC|FRONT_DESK_HOSPITAL|PROFESSIONAL|HOSPITAL|ENTERPRISE)\s+(MONTHLY|YEARLY)\s+subscription\b/i.test(
    description.trim(),
  );
}

function parseTierFromUpgradeDescription(
  description: string | null | undefined,
): string | null {
  if (!description || typeof description !== 'string') return null;
  const m = description
    .trim()
    .match(
      /^(STARTER|ESSENTIAL|FRONT_DESK|FRONT_DESK_CLINIC|FRONT_DESK_HOSPITAL|PROFESSIONAL|HOSPITAL|ENTERPRISE)\s+(MONTHLY|YEARLY)\s+subscription$/i,
    );
  return m?.[1] ? m[1].toUpperCase() : null;
}

export function filterPendingPlanCheckoutMismatches<
  T extends PaymentHistoryRecord,
>(records: T[], currentPlan: string | undefined): T[] {
  if (!currentPlan) return records;
  return records.filter((record) => {
    const status = (
      record.status ?? String(record.getStatus?.() ?? '')
    ).toLowerCase();
    if (!isPendingLikeStatus(status)) return true;
    if (!isTierUpgradeSubscriptionDescription(record.description)) return true;
    const rowTier = parseTierFromUpgradeDescription(record.description);
    if (!rowTier) return true;
    return rowTier === currentPlan;
  });
}

export function collapseStaleUpgradePendingCheckouts<
  T extends PaymentHistoryRecord,
>(records: T[]): T[] {
  const pendingUpgradeIndexes: number[] = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record) {
      continue;
    }
    const status = (
      record.status ?? String(record.getStatus?.() ?? '')
    ).toLowerCase();
    if (!isPendingLikeStatus(status)) continue;
    if (!isTierUpgradeSubscriptionDescription(record.description)) continue;
    pendingUpgradeIndexes.push(i);
  }
  if (pendingUpgradeIndexes.length <= 1) return records;

  const firstPendingIndex = pendingUpgradeIndexes[0];
  if (firstPendingIndex === undefined) {
    return records;
  }
  let newestIndex = firstPendingIndex;
  let newestTs = new Date(records[newestIndex].createdAt).getTime();
  for (const idx of pendingUpgradeIndexes) {
    const ts = new Date(records[idx].createdAt).getTime();
    if (ts >= newestTs) {
      newestTs = ts;
      newestIndex = idx;
    }
  }
  const drop = new Set(
    pendingUpgradeIndexes.filter((idx) => idx !== newestIndex),
  );
  return records.filter((_, i) => !drop.has(i));
}
