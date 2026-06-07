import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSystemLogsFilterState } from "./use-system-logs-filter-state";
import { buildFilterUrl, buildLogsQueryParams } from "./system-logs-helpers";

const mockReplace = vi.hoisted(() => vi.fn());
const mockSearchParams = vi.hoisted(() => ({
  get: vi.fn<(key: string) => string | null>(() => null),
  toString: vi.fn(() => ""),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/system-logs",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("./system-logs-helpers", () => ({
  parseLogLevel: vi.fn(
    (val: string | null): "ALL" | "INFO" | "WARNING" | "ERROR" | "DEBUG" => {
      if (
        val === "INFO" ||
        val === "WARNING" ||
        val === "ERROR" ||
        val === "DEBUG"
      )
        return val;
      return "ALL";
    },
  ),
  parseLogLimit: vi.fn(
    (val: string | null, fallback: 25 | 50 | 100): 25 | 50 | 100 => {
      if (val === "25") return 25;
      if (val === "50") return 50;
      if (val === "100") return 100;
      return fallback;
    },
  ),
  buildFilterUrl: vi.fn((..._args: unknown[]): string | null => null),
  buildLogsQueryParams: vi.fn(
    (..._args: unknown[]): string => "limit=50&offset=0",
  ),
}));

beforeEach(() => {
  mockReplace.mockReset();
  mockSearchParams.get.mockReset().mockReturnValue(null);
  mockSearchParams.toString.mockReset().mockReturnValue("");
  vi.clearAllMocks();
});

describe("useSystemLogsFilterState", () => {
  it("initial state uses defaultLimit 50 for selectedLimit", () => {
    const { result } = renderHook(() => useSystemLogsFilterState(50));
    expect(result.current.selectedLimit).toBe(50);
  });

  it("initial state uses defaultLimit 25 for selectedLimit", () => {
    const { result } = renderHook(() => useSystemLogsFilterState(25));
    expect(result.current.selectedLimit).toBe(25);
  });

  it("initial state uses defaultLimit 100 for selectedLimit", () => {
    const { result } = renderHook(() => useSystemLogsFilterState(100));
    expect(result.current.selectedLimit).toBe(100);
  });

  it("reads searchParams from URL on mount and sets corresponding state", () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === "level") return "ERROR";
      if (key === "module") return "auth";
      if (key === "q") return "test search";
      if (key === "limit") return "25";
      if (key === "offset") return "10";
      return null;
    });

    const { result } = renderHook(() => useSystemLogsFilterState(50));

    expect(result.current.selectedLevel).toBe("ERROR");
    expect(result.current.selectedModule).toBe("auth");
    expect(result.current.searchText).toBe("test search");
    expect(result.current.selectedLimit).toBe(25);
    expect(result.current.selectedOffset).toBe(10);
  });

  it("updateFilterParams calls router.replace with the URL from buildFilterUrl", () => {
    vi.mocked(buildFilterUrl).mockReturnValue(
      "/system-logs?level=ERROR&limit=50",
    );

    const { result } = renderHook(() => useSystemLogsFilterState(50));

    act(() => {
      result.current.updateFilterParams({ level: "ERROR" });
    });

    expect(mockReplace).toHaveBeenCalledWith(
      "/system-logs?level=ERROR&limit=50",
      { scroll: false },
    );
  });

  it("logsParams memo calls buildLogsQueryParams with current filter state", () => {
    vi.mocked(buildLogsQueryParams).mockReturnValue(
      "limit=25&offset=0&level=ALL",
    );

    const { result } = renderHook(() => useSystemLogsFilterState(25));

    expect(buildLogsQueryParams).toHaveBeenCalledWith(25, 0, "ALL", "ALL", "");
    expect(result.current.logsParams).toBe("limit=25&offset=0&level=ALL");
  });

  it("setter functions update their respective state values", () => {
    const { result } = renderHook(() => useSystemLogsFilterState(50));

    act(() => {
      result.current.setSelectedLevel("ERROR");
    });
    expect(result.current.selectedLevel).toBe("ERROR");

    act(() => {
      result.current.setSelectedModule("auth");
    });
    expect(result.current.selectedModule).toBe("auth");

    act(() => {
      result.current.setSearchText("searching");
    });
    expect(result.current.searchText).toBe("searching");

    act(() => {
      result.current.setSelectedLimit(100);
    });
    expect(result.current.selectedLimit).toBe(100);

    act(() => {
      result.current.setSelectedOffset(20);
    });
    expect(result.current.selectedOffset).toBe(20);

    act(() => {
      result.current.setRefreshing(true);
    });
    expect(result.current.refreshing).toBe(true);
  });

  it("reads offset parameter and defaults to 0 for invalid values", () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === "offset") return "-5";
      return null;
    });

    const { result } = renderHook(() => useSystemLogsFilterState(50));
    expect(result.current.selectedOffset).toBe(0);
  });

  it("reads offset parameter and defaults to 0 for NaN values", () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === "offset") return "invalid";
      return null;
    });

    const { result } = renderHook(() => useSystemLogsFilterState(50));
    expect(result.current.selectedOffset).toBe(0);
  });

  it("does not call router.replace when buildFilterUrl returns null", () => {
    vi.mocked(buildFilterUrl).mockReturnValue(null);

    const { result } = renderHook(() => useSystemLogsFilterState(50));

    act(() => {
      result.current.updateFilterParams({ level: "ERROR" });
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("debounced search effect calls updateFilterParams after 250ms", () => {
    vi.useFakeTimers();
    vi.mocked(buildFilterUrl).mockReturnValue("/system-logs?q=test");

    const { result } = renderHook(() => useSystemLogsFilterState(50));

    act(() => {
      result.current.setSearchText("test");
    });

    expect(result.current.searchText).toBe("test");
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(mockReplace).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("logsParams updates when filter state changes", () => {
    const { result } = renderHook(() => useSystemLogsFilterState(50));

    act(() => {
      result.current.setSelectedLevel("ERROR");
    });

    expect(buildLogsQueryParams).toHaveBeenCalledWith(50, 0, "ERROR", "ALL", "");
  });

  it("reads module and limit parameters from URL on mount", () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === "module") return "billing";
      if (key === "limit") return "100";
      return null;
    });

    const { result } = renderHook(() => useSystemLogsFilterState(50));

    expect(result.current.selectedModule).toBe("billing");
    expect(result.current.selectedLimit).toBe(100);
  });
});
