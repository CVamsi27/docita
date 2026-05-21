export type QueryPrimitive = string | number | boolean | Date | null | undefined;
export type QueryValue = QueryPrimitive | QueryPrimitive[];
export type QueryParams = Record<string, QueryValue>;

const isEmpty = (value: string): boolean => value.trim().length === 0;

const toStringValue = (value: QueryPrimitive): string | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const stringValue = String(value);
  if (isEmpty(stringValue)) return null;
  return stringValue;
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
  const result: QueryParams = {};

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    if (Array.isArray(rawValue)) {
      const entries = rawValue.filter(
        (entry) => entry !== undefined && entry !== null && entry !== "",
      );
      if (entries.length > 0) {
        result[key] = entries;
      }
      continue;
    }

    result[key] = rawValue;
  }

  return result;
}

export const withQueryString = (path: string, params?: QueryParams): string => {
  const queryString = toQueryString(params);
  if (!queryString) return path;
  return `${path}?${queryString}`;
};
