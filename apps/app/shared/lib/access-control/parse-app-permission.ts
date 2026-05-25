import { APP_PERMISSIONS, type AppPermission } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

export function parseAppPermission(value: string): AppPermission | null {
  return parseStringEnumMember(APP_PERMISSIONS, value);
}
