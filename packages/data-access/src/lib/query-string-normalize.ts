import type { QueryParams, QueryPrimitive } from "./query-string-types";

function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export function toStringValue(value: QueryPrimitive): string | null {
  const stringValue = value instanceof Date ? value.toISOString() : value == null ? null : String(value);
  return stringValue === null || isEmpty(stringValue) ? null : stringValue;
}

function hasQueryValue(value: QueryPrimitive): boolean {
  return value !== undefined && value !== null && value !== "";
}

function queryValueOrUndefined(rawValue: QueryParams[string]): QueryParams[string] | undefined {
  if (!Array.isArray(rawValue)) {
    return hasQueryValue(rawValue) ? rawValue : undefined;
  }

  const entries = rawValue.filter(hasQueryValue);
  return entries.length > 0 ? entries : undefined;
}

export function omitEmptyQueryParams(params: QueryParams): QueryParams {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, rawValue]) => {
      const normalized = queryValueOrUndefined(rawValue);
      return normalized === undefined ? [] : [[key, normalized]];
    }),
  );
}
