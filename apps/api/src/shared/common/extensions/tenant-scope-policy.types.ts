import { isRecord } from '@workspace/utils';

const TENANT_FIELD = 'clinicId';

export type PropertyValue =
  | object
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export interface TenantExtensionArgs {
  where?: Record<string, PropertyValue>;
  data?: Record<string, PropertyValue> | Record<string, PropertyValue>[];
}

export type TenantScopeRule =
  | { kind: 'direct' }
  | { kind: 'relation'; path: readonly string[] };

export interface TenantScopeRuleSnapshot {
  model: string;
  kind: TenantScopeRule['kind'];
  path?: readonly string[];
}

function isPropertyValue(entry: unknown): entry is PropertyValue {
  return (
    entry === null ||
    entry === undefined ||
    typeof entry === 'string' ||
    typeof entry === 'number' ||
    typeof entry === 'boolean' ||
    typeof entry === 'bigint' ||
    typeof entry === 'symbol' ||
    typeof entry === 'object'
  );
}

export function readPropertyValueRecord(
  value: unknown,
): Record<string, PropertyValue> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const record: Record<string, PropertyValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isPropertyValue(entry)) {
      record[key] = entry;
    }
  }
  return record;
}

export { TENANT_FIELD };
