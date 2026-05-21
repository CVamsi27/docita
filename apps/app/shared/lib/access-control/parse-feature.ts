import { Feature } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

const FEATURE_VALUES = Object.values(Feature) as Feature[];

export function parseFeature(value: string): Feature | null {
  return parseStringEnumMember(FEATURE_VALUES, value);
}
