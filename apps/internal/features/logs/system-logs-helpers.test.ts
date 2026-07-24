import { describe, expect, it } from "vitest";
import {
  buildFilterUrl,
  buildLogsQueryParams,
  countActiveFilters,
  parseLogLevel,
  parseLogLimit,
} from "./system-logs-helpers";

describe("parseLogLimit", () => {
  it.each(["25", "50", "100"] as const)("parses '%s'", (value) => {
    expect(parseLogLimit(value, 25)).toBe(Number(value));
  });

  it("returns the fallback for any other string", () => {
    expect(parseLogLimit(null, 50)).toBe(50);
    expect(parseLogLimit("200", 25)).toBe(25);
    expect(parseLogLimit("abc", 100)).toBe(100);
  });
});

describe("parseLogLevel", () => {
  it("returns 'ALL' for null / unknown values", () => {
    expect(parseLogLevel(null)).toBe("ALL");
    expect(parseLogLevel("TRACE")).toBe("ALL");
    expect(parseLogLevel("")).toBe("ALL");
  });

  it.each(["INFO", "WARNING", "ERROR", "DEBUG"] as const)(
    "parses '%s'",
    (value) => {
      expect(parseLogLevel(value)).toBe(value);
    },
  );
});

describe("countActiveFilters", () => {
  it("returns 0 when nothing is active", () => {
    expect(countActiveFilters("ALL", "ALL", "")).toBe(0);
  });

  it("counts a level filter", () => {
    expect(countActiveFilters("ERROR", "ALL", "")).toBe(1);
  });

  it("counts a module filter", () => {
    expect(countActiveFilters("ALL", "billing", "")).toBe(1);
  });

  it("counts a non-whitespace search", () => {
    expect(countActiveFilters("ALL", "ALL", "boom")).toBe(1);
  });

  it("does not count whitespace-only search", () => {
    expect(countActiveFilters("ALL", "ALL", "   ")).toBe(0);
  });

  it("counts all three together", () => {
    expect(countActiveFilters("ERROR", "billing", "boom")).toBe(3);
  });
});

describe("buildFilterUrl", () => {
  const pathname = "/internal/logs";

  it("returns null when no params change", () => {
    const next = {
      level: "ALL",
      module: "ALL",
      q: "",
      limit: 25,
      offset: 0,
    };
    expect(buildFilterUrl("", pathname, next, 25)).toBeNull();
  });

  it("builds a fresh query when params differ", () => {
    const next = {
      level: "ERROR",
      module: "ALL",
      q: "",
      limit: 25,
      offset: 0,
    };
    expect(buildFilterUrl("", pathname, next, 25)).toBe(
      `${pathname}?level=ERROR`,
    );
  });

  it("omits default limit and zero offset", () => {
    const next = {
      level: "ALL",
      module: "billing",
      q: "boom",
      limit: 50,
      offset: 0,
    };
    expect(buildFilterUrl("", pathname, next, 25)).toBe(
      `${pathname}?module=billing&q=boom&limit=50`,
    );
  });

  it("returns just the pathname when all params are defaults (empty query)", () => {
    const next = {
      level: "ALL",
      module: "ALL",
      q: "",
      limit: 100,
      offset: 0,
    };
    expect(buildFilterUrl("?level=ERROR", pathname, next, 100)).toBe(pathname);
  });
});

describe("buildLogsQueryParams", () => {
  it("always includes limit and offset", () => {
    const params = buildLogsQueryParams(25, 0, "ALL", "ALL", "");
    expect(params).toContain("limit=25");
    expect(params).toContain("offset=0");
  });

  it("omits level and module when ALL", () => {
    const params = buildLogsQueryParams(25, 0, "ALL", "ALL", "");
    expect(params).not.toContain("level=");
    expect(params).not.toContain("module=");
  });

  it("includes level and module when set", () => {
    const params = buildLogsQueryParams(50, 0, "ERROR", "billing", "");
    expect(params).toContain("level=ERROR");
    expect(params).toContain("module=billing");
  });

  it("trims search text and includes when non-empty", () => {
    expect(buildLogsQueryParams(25, 0, "ALL", "ALL", "  boom  ")).toContain(
      "q=boom",
    );
    expect(buildLogsQueryParams(25, 0, "ALL", "ALL", "   ")).not.toContain(
      "q=",
    );
  });
});
