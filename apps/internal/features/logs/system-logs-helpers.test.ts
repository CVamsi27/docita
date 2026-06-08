import { describe, expect, it } from "vitest";
import {
  buildFilterUrl,
  buildLogsQueryParams,
  countActiveFilters,
  parseLogLevel,
  parseLogLimit,
} from "./system-logs-helpers";

describe("parseLogLimit", () => {
  it("returns numeric value for valid strings", () => {
    expect(parseLogLimit("25", 50)).toBe(25);
    expect(parseLogLimit("50", 25)).toBe(50);
    expect(parseLogLimit("100", 25)).toBe(100);
  });

  it("returns fallback for invalid or null values", () => {
    expect(parseLogLimit(null, 25)).toBe(25);
    expect(parseLogLimit("invalid", 50)).toBe(50);
    expect(parseLogLimit("0", 100)).toBe(100);
  });
});

describe("parseLogLevel", () => {
  it("passes through recognized log levels", () => {
    expect(parseLogLevel("INFO")).toBe("INFO");
    expect(parseLogLevel("WARNING")).toBe("WARNING");
    expect(parseLogLevel("ERROR")).toBe("ERROR");
    expect(parseLogLevel("DEBUG")).toBe("DEBUG");
  });

  it("returns ALL for null or unrecognized values", () => {
    expect(parseLogLevel(null)).toBe("ALL");
    expect(parseLogLevel("FATAL")).toBe("ALL");
    expect(parseLogLevel("")).toBe("ALL");
  });
});

describe("countActiveFilters", () => {
  it("counts level, module, and search text", () => {
    expect(countActiveFilters("ERROR", "auth", "test")).toBe(3);
    expect(countActiveFilters("ALL", "auth", "")).toBe(1);
    expect(countActiveFilters("ALL", "ALL", "")).toBe(0);
    expect(countActiveFilters("ERROR", "ALL", "  ")).toBe(1);
  });
});

describe("buildFilterUrl", () => {
  const pathname = "/logs";
  const defaults = { level: "ALL", module: "ALL", q: "", limit: 25, offset: 0 };
  const defaultLimit = 25;

  it("returns null when params match current", () => {
    const current = "level=ERROR&q=test";
    const next = { ...defaults, level: "ERROR", q: "test", limit: 25 };
    expect(buildFilterUrl(current, pathname, next, defaultLimit)).toBeNull();
  });

  it("returns just pathname when all params return to default", () => {
    const url = buildFilterUrl("level=ERROR", pathname, defaults, defaultLimit);
    expect(url).toBe(pathname);
  });

  it("sets non-default params in the URL", () => {
    const next = { ...defaults, level: "ERROR", module: "auth", q: "login", limit: 50, offset: 10 };
    const url = buildFilterUrl("", pathname, next, defaultLimit);
    expect(url).toContain("level=ERROR");
    expect(url).toContain("module=auth");
    expect(url).toContain("q=login");
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=10");
  });

  it("omits limit when it matches defaultLimit", () => {
    const next = { ...defaults, level: "ERROR", limit: 25 };
    const url = buildFilterUrl("", pathname, next, defaultLimit);
    expect(url).not.toContain("limit");
  });

  it("omits offset when <= 0", () => {
    const next = { ...defaults, level: "ERROR", offset: 0 };
    const url = buildFilterUrl("", pathname, next, defaultLimit);
    expect(url).not.toContain("offset");
  });

  it("removes q param when search text is empty", () => {
    const current = "q=old";
    const next = { ...defaults, level: "ERROR" };
    const url = buildFilterUrl(current, pathname, next, defaultLimit);
    expect(url).not.toContain("q=");
  });
});

describe("buildLogsQueryParams", () => {
  it("includes limit and offset always", () => {
    const qs = buildLogsQueryParams(25, 0, "ALL", "ALL", "");
    expect(qs).toContain("limit=25");
    expect(qs).toContain("offset=0");
  });

  it("includes level when not ALL", () => {
    const qs = buildLogsQueryParams(50, 10, "ERROR", "ALL", "");
    expect(qs).toContain("level=ERROR");
    expect(qs).not.toContain("module=");
  });

  it("includes module when not ALL", () => {
    const qs = buildLogsQueryParams(50, 10, "ALL", "auth", "");
    expect(qs).toContain("module=auth");
    expect(qs).not.toContain("level=");
  });

  it("includes search query when non-empty", () => {
    const qs = buildLogsQueryParams(50, 10, "ALL", "ALL", "patient");
    expect(qs).toContain("q=patient");
  });

  it("trims whitespace from search text", () => {
    const qs = buildLogsQueryParams(50, 10, "ALL", "ALL", "  error  ");
    expect(qs).toContain("q=error");
  });

  it("omits q when search text is empty after trim", () => {
    const qs = buildLogsQueryParams(50, 10, "ALL", "ALL", "   ");
    expect(qs).not.toContain("q=");
  });
});
