import { Feature } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

export function parseFeature(value: string): Feature | null {
  return parseStringEnumMember(Object.values(Feature), value);
}
