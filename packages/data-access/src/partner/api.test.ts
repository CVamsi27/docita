import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPartnerFetcher, partnerApi } from "./api";

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => impl(url, init)),
  );
}

describe("createPartnerFetcher", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an Authorization header when an access token is provided", async () => {
    const seen: { url: string; init: RequestInit | undefined } = { url: "", init: undefined };
    mockFetch(async (url, init) => {
      seen.url = url;
      seen.init = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const fetch = createPartnerFetcher({
      accessToken: "tok_123",
      baseUrl: "https://api.docita.work",
    });
    await fetch("/partner/me");

    expect(seen.url).toBe("https://api.docita.work/partner/me");
    const headers = seen.init?.headers as Record<string, string> | undefined;
    expect(headers?.["Authorization"]).toBe("Bearer tok_123");
    expect(headers?.["Content-Type"]).toBe("application/json");
    expect(seen.init?.method).toBe("GET");
    expect(seen.init?.credentials).toBe("include");
  });

  it("omits the Authorization header when no token is present", async () => {
    const seen: { init: RequestInit | undefined } = { init: undefined };
    mockFetch(async (_url, init) => {
      seen.init = init;
      return new Response("{}", { status: 200 });
    });
    const fetch = createPartnerFetcher({ accessToken: null });
    await fetch("/partner/me");
    const headers = seen.init?.headers as Record<string, string> | undefined;
    expect(headers?.["Authorization"]).toBeUndefined();
  });

  it("joins a missing/empty base URL by using the endpoint as-is", async () => {
    const seen: { url: string } = { url: "" };
    mockFetch(async (url) => {
      seen.url = url;
      return new Response("{}", { status: 200 });
    });
    const fetch = createPartnerFetcher({ accessToken: "x" });
    await fetch("/partner/me");
    expect(seen.url).toBe("/partner/me");
  });

  it("honors absolute endpoint URLs (does not double-prefix the base)", async () => {
    const seen: { url: string } = { url: "" };
    mockFetch(async (url) => {
      seen.url = url;
      return new Response("{}", { status: 200 });
    });
    const fetch = createPartnerFetcher({
      accessToken: "x",
      baseUrl: "https://api.docita.work",
    });
    await fetch("https://other.example/partner/me");
    expect(seen.url).toBe("https://other.example/partner/me");
  });

  it("strips a trailing slash on the base URL", async () => {
    const seen: { url: string } = { url: "" };
    mockFetch(async (url) => {
      seen.url = url;
      return new Response("{}", { status: 200 });
    });
    const fetch = createPartnerFetcher({
      accessToken: "x",
      baseUrl: "https://api.docita.work/",
    });
    await fetch("/partner/me");
    expect(seen.url).toBe("https://api.docita.work/partner/me");
  });

  it("serializes the JSON body when provided", async () => {
    const seen: { init: RequestInit | undefined } = { init: undefined };
    mockFetch(async (_url, init) => {
      seen.init = init;
      return new Response("{}", { status: 200 });
    });
    const fetch = createPartnerFetcher({ accessToken: "x" });
    await fetch("/partner/auth/request-otp", {
      method: "POST",
      body: { phone: "+919999999999" },
    });
    expect(seen.init?.method).toBe("POST");
    expect(seen.init?.body).toBe(
      JSON.stringify({ phone: "+919999999999" }),
    );
  });

  it("returns undefined for a 204 No Content response", async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    const fetch = createPartnerFetcher({ accessToken: "x" });
    const out = await fetch<undefined>("/partner/me/logout");
    expect(out).toBeUndefined();
  });

  it("throws a Partner API error including status + text on a non-2xx", async () => {
    mockFetch(
      async () =>
        new Response("bad code", {
          status: 401,
          statusText: "Unauthorized",
        }),
    );
    const fetch = createPartnerFetcher({ accessToken: "x" });
    await expect(
      fetch<{ ok: true }>("/partner/me"),
    ).rejects.toThrow(/Partner API 401/);
  });
});

describe("partnerApi", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("requestOtp POSTs the phone to /partner/auth/request-otp", async () => {
    const seen: { url: string; init: RequestInit | undefined } = { url: "", init: undefined };
    mockFetch(async (url, init) => {
      seen.url = url;
      seen.init = init;
      return new Response(
        JSON.stringify({ message: "ok", expiresInSeconds: 600 }),
        { status: 200 },
      );
    });
    await partnerApi.requestOtp(
      { phone: "+919999999999" },
      { accessToken: null },
    );
    expect(seen.url).toMatch(/\/partner\/auth\/request-otp$/);
    expect(seen.init?.method).toBe("POST");
    expect(seen.init?.body).toBe(JSON.stringify({ phone: "+919999999999" }));
  });

  it("verifyOtp POSTs the phone + OTP", async () => {
    const seen: { url: string; init: RequestInit | undefined } = { url: "", init: undefined };
    mockFetch(async (url, init) => {
      seen.url = url;
      seen.init = init;
      return new Response("{}", { status: 200 });
    });
    await partnerApi.verifyOtp(
      { phone: "+919999999999", otp: "123456" },
      { accessToken: null },
    );
    expect(seen.url).toMatch(/\/partner\/auth\/verify-otp$/);
    expect(seen.init?.body).toBe(
      JSON.stringify({ phone: "+919999999999", otp: "123456" }),
    );
  });

  it("listPayouts appends a query string with all set params", async () => {
    const seen: { url: string } = { url: "" };
    mockFetch(async (url) => {
      seen.url = url;
      return new Response("{}", { status: 200 });
    });
    await partnerApi.listPayouts(
      { status: "PENDING", limit: 25, cursor: "abc" },
      { accessToken: "x" },
    );
    expect(seen.url).toContain("/partner/me/payouts?");
    expect(seen.url).toContain("status=PENDING");
    expect(seen.url).toContain("limit=25");
    expect(seen.url).toContain("cursor=abc");
  });

  it("listPayouts appends an empty query when no params are set", async () => {
    const seen: { url: string } = { url: "" };
    mockFetch(async (url) => {
      seen.url = url;
      return new Response("{}", { status: 200 });
    });
    await partnerApi.listPayouts(undefined, { accessToken: "x" });
    expect(seen.url).toMatch(/\/partner\/me\/payouts$/);
  });

  it("listReferrals mirrors the payouts query-string shape", async () => {
    const seen: { url: string } = { url: "" };
    mockFetch(async (url) => {
      seen.url = url;
      return new Response("{}", { status: 200 });
    });
    await partnerApi.listReferrals(
      { status: "SIGNED_UP", limit: 10 },
      { accessToken: "x" },
    );
    expect(seen.url).toContain("/partner/me/referrals?");
    expect(seen.url).toContain("status=SIGNED_UP");
    expect(seen.url).toContain("limit=10");
  });

  it("upsertPayoutDetails PUTs to /partner/me/payout-details", async () => {
    const seen: { url: string; init: RequestInit | undefined } = { url: "", init: undefined };
    mockFetch(async (url, init) => {
      seen.url = url;
      seen.init = init;
      return new Response("{}", { status: 200 });
    });
    await partnerApi.upsertPayoutDetails(
      {
        accountHolder: "A",
        accountNumber: "1",
        ifsc: "X",
        bankName: "B",
      },
      { accessToken: "x" },
    );
    expect(seen.url).toMatch(/\/partner\/me\/payout-details$/);
    expect(seen.init?.method).toBe("PUT");
  });

  it("getMe GETs /partner/me", async () => {
    const seen: { url: string; init: RequestInit | undefined } = { url: "", init: undefined };
    mockFetch(async (url, init) => {
      seen.url = url;
      seen.init = init;
      return new Response("{}", { status: 200 });
    });
    await partnerApi.getMe({ accessToken: "x" });
    expect(seen.url).toMatch(/\/partner\/me$/);
    expect(seen.init?.method).toBe("GET");
  });
});
