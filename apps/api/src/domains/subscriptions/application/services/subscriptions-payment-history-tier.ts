const UPGRADE_DESCRIPTION_PATTERN =
  /\b(STARTER|ESSENTIAL|FRONT_DESK|PROFESSIONAL|HOSPITAL|ENTERPRISE)\s+(MONTHLY|YEARLY)\s+subscription\b/i;

const UPGRADE_DESCRIPTION_EXACT_PATTERN =
  /^(STARTER|ESSENTIAL|FRONT_DESK|PROFESSIONAL|HOSPITAL|ENTERPRISE)\s+(MONTHLY|YEARLY)\s+subscription$/i;

export function isTierUpgradeSubscriptionDescription(
  description: string | null | undefined,
): boolean {
  return typeof description === 'string'
    ? UPGRADE_DESCRIPTION_PATTERN.test(description.trim())
    : false;
}

export function parseTierFromUpgradeDescription(
  description: string | null | undefined,
): string | null {
  if (typeof description !== 'string') return null;
  const match = description.trim().match(UPGRADE_DESCRIPTION_EXACT_PATTERN);
  return match?.[1] ? match[1].toUpperCase() : null;
}
