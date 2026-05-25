import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getToken: vi.fn(),
}));

const payload = {
  type: "ConsoleError",
  message: "Something went wrong",
  severity: "ERROR" as const,
};

async function loadReporterModule() {
  vi.doMock("@/lib/auth/session", () => ({
    appSession: {
      getToken: mocks.getToken,
    },
  }));

  return import("./client-error-reporting");
}

describe("reportClientError", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.fetch.mockReset();
    mocks.getToken.mockReset();
    sessionStorage.clear();
    vi.stubGlobal("fetch", mocks.fetch);
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("does not send telemetry when auth token is missing", async () => {
    mocks.getToken.mockReturnValue(null);
    const { reportClientError } = await loadReporterModule();

    await reportClientError(payload);

    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("backs off after forbidden response to avoid noisy retries", async () => {
    mocks.getToken.mockReturnValue("token");
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 403 }));
    const { reportClientError } = await loadReporterModule();

    await reportClientError(payload);
    await reportClientError(payload);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(
      Number(
        sessionStorage.getItem(
          "docita_client_error_reporting_disabled_until",
        ),
      ),
    ).toBeGreaterThan(Date.now());
  });

  it("resumes telemetry after backoff window expires", async () => {
    mocks.getToken.mockReturnValue("token");
    let now = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    mocks.fetch
      .mockResolvedValueOnce(new Response("{}", { status: 403 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const { reportClientError } = await loadReporterModule();

    await reportClientError(payload);
    await reportClientError(payload);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    now += 15 * 60 * 1000 + 1;
    await reportClientError(payload);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it("skips telemetry when browser is offline", async () => {
    mocks.getToken.mockReturnValue("token");
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    const { reportClientError } = await loadReporterModule();

    await reportClientError(payload);

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });
});
