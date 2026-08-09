import { DEFAULT_TIMEZONE } from "@workspace/utils";

/**
 * Resolve the clinic's configured IANA timezone, falling back to the
 * canonical DEFAULT_TIMEZONE when unset or blank.
 *
 * Lives in the shared layer (not the appointments feature) because desk,
 * whatsapp, subscription, and patients views all render clinic wall-clock
 * times through it — see check-feature-boundaries.
 */
export function getClinicTimezoneOrDefault(
  clinic: { timezone?: string | null } | undefined | null,
): string {
  const trimmed = clinic?.timezone?.trim();
  return trimmed || DEFAULT_TIMEZONE;
}
