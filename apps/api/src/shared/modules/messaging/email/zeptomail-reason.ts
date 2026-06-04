import { EmailSuppressionReason } from '@workspace/db';

export function reasonFromKeywords(
  values: string[],
): EmailSuppressionReason | null {
  const joined = values.join(' ').toLowerCase();
  if (/spam|complaint|abuse/.test(joined)) {
    return EmailSuppressionReason.COMPLAINT;
  }
  if (/unsub/.test(joined)) return EmailSuppressionReason.UNSUBSCRIBE;
  if (/soft.?bounce/.test(joined)) return EmailSuppressionReason.SOFT_BOUNCE;
  if (/bounce/.test(joined)) return EmailSuppressionReason.HARD_BOUNCE;
  return null;
}
