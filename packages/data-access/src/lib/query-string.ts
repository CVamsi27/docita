import {
  omitEmptyQueryParams as omitEmpty,
  toStringValue,
} from "./query-string-normalize";
import type { QueryParams } from "./query-string-types";
export type { QueryParams, QueryPrimitive, QueryValue } from "./query-string-types";

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

export const omitEmptyQueryParams = omitEmpty;

export const withQueryString = (path: string, params?: QueryParams): string => {
  const queryString = toQueryString(params);
  if (!queryString) return path;
  return `${path}?${queryString}`;
};
