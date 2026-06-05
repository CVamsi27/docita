export type QueryPrimitive = string | number | boolean | Date | null | undefined;
export type QueryValue = QueryPrimitive | QueryPrimitive[];
export type QueryParams = Record<string, QueryValue>;

const isEmpty = (value: string): boolean => value.trim().length === 0;

const toStringValue = (value: QueryPrimitive): string | null => {
  const stringValue = value instanceof Date ? value.toISOString() : value == null ? null : String(value);
  return stringValue === null || isEmpty(stringValue) ? null : stringValue;
};

export const toQueryString = (params?: QueryParams): string => {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, rawValue]) => {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((entry) => {
        const normalized = toStringValue(entry);
        if (normalized !== null) {
          searchParams.append(key, normalized);
        }
      });
      return;
    }

    const normalized = toStringValue(rawValue);
    if (normalized !== null) {
      searchParams.append(key, normalized);
    }
  });

  return searchParams.toString();
};

export function omitEmptyQueryParams(params: QueryParams): QueryParams {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, rawValue]) => {
      const normalized = queryValueOrUndefined(rawValue);
      return normalized === undefined ? [] : [[key, normalized]];
    }),
  );
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

export const withQueryString = (path: string, params?: QueryParams): string => {
  const queryString = toQueryString(params);
  if (!queryString) return path;
  return `${path}?${queryString}`;
};
