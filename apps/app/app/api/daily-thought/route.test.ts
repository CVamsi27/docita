import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

describe("GET /api/daily-thought", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns quote and author from ZenQuotes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { q: " Hello world. ", a: " Author Name " },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");

    const body = (await res.json()) as { quote: string; author: string };
    expect(body.quote).toBe("Hello world.");
    expect(body.author).toBe("Author Name");
    expect(fetch).toHaveBeenCalledWith(
      "https://zenquotes.io/api/today",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("returns fallback when ZenQuotes returns invalid JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { GET } = await import("./route");
    const res = await GET();
    const body = (await res.json()) as { quote: string; author: string };

    expect(body.quote).toContain("trust");
    expect(body.author).toBe("Ernest Hemingway");
  });

  it("returns fallback when fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    const { GET } = await import("./route");
    const res = await GET();
    const body = (await res.json()) as { quote: string; author: string };

    expect(body.author).toBe("Ernest Hemingway");
  });

  it("times out slow ZenQuotes responses and returns fallback", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      new DOMException("The operation was aborted.", "TimeoutError"),
    );

    const { GET } = await import("./route");
    const res = await GET();
    const body = (await res.json()) as { quote: string; author: string };

    expect(body.author).toBe("Ernest Hemingway");
    expect(fetch).toHaveBeenCalledWith(
      "https://zenquotes.io/api/today",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
