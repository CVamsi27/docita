import { Feature } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

/**
 * Parses a string into a valid {@link Feature} enum member, returning `null`
 * when the value is not a known feature key. Used at the data-access boundary
 * so tier checks stay typed (never ad-hoc string comparisons).
 */
export function parseFeature(value: string): Feature | null {
  return parseStringEnumMember(Object.values(Feature), value);
}
