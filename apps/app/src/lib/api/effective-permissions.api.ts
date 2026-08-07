import {
  effectivePermissionsResponseSchema,
  type EffectivePermissionsResponse,
} from "@workspace/types";
import { api } from "@/lib/api/api-client";
import { isRecord } from "@workspace/utils";

/**
 * C7 (ADR-0013): fetch the server-derived permission snapshot. The payload is
 * NON-authoritative — the server remains the enforcement point; the UI uses
 * this only to preview decisions and falls back to the local matrix offline.
 */
export async function fetchEffectivePermissions(): Promise<EffectivePermissionsResponse> {
  const raw = await api.get<unknown>("/auth/effective-permissions");
  return effectivePermissionsResponseSchema.parse(
    isRecord(raw) ? raw : {},
  );
}
