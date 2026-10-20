import { describe, expect, it } from "vitest";
import { searchResultTypeSchema } from "@workspace/types";

import {
  searchResultRoutes,
  typeColors,
  typeIcons,
} from "./global-search-constants";

const searchableTypes = [...searchResultTypeSchema.options];

/**
 * `useGlobalSearch` navigates through `searchResultRoutes[result.type]` and the
 * results panel indexes `typeIcons` / `typeColors` the same way, none of them
 * with a fallback branch. The `satisfies Record<SearchResultType, ...>`
 * annotations catch a new entity type at build time; these assertions catch the
 * same drift at test time, where it is cheaper to read.
 */
describe("global search entity maps", () => {
  it.each([
    ["typeIcons", Object.keys(typeIcons)],
    ["typeColors", Object.keys(typeColors)],
    ["searchResultRoutes", Object.keys(searchResultRoutes)],
  ])("%s covers every searchable entity type", (_name, keys) => {
    expect([...keys].sort()).toEqual([...searchableTypes].sort());
  });

  it("exposes no key outside the searchable types", () => {
    const maps = [typeIcons, typeColors, searchResultRoutes];
    for (const map of maps) {
      expect(Object.keys(map).every((key) => searchableTypes.includes(key as never))).toBe(true);
    }
  });

  it("routes every searchable entity type to a path", () => {
    for (const type of searchableTypes) {
      expect(searchResultRoutes[type]("entity-1")).toContain("entity-1");
    }
  });
});