import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSentryClientConfig } from "./sentry-client-config.js";

// The loader treats NODE_ENV=development as "Sentry disabled" and reads
// process.env at creation time, so the enabled-path assertions need a non-dev
// NODE_ENV regardless of how the suite is invoked.
const ORIGINAL_NODE_ENV = process.env["NODE_ENV"];

beforeAll(() => {
  process.env["NODE_ENV"] = "test";
  globalThis.window = {} as Window & typeof globalThis;
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>)["window"];
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env["NODE_ENV"];
  } else {
    process.env["NODE_ENV"] = ORIGINAL_NODE_ENV;
  }
});

function createFakeSentry() {
  const calls: { method: string; args: unknown[] }[] = [];
  const module = {
    init: (options: unknown) => {
      calls.push({ method: "init", args: [options] });
    },
    setUser: (user: unknown) => {
      calls.push({ method: "setUser", args: [user] });
    },
    setTag: (key: unknown, value: unknown) => {
      calls.push({ method: "setTag", args: [key, value] });
    },
    captureException: (error: unknown, options?: unknown) => {
      calls.push({ method: "captureException", args: [error, options] });
    },
    captureMessage: (message: unknown, options?: unknown) => {
      calls.push({ method: "captureMessage", args: [message, options] });
    },
    addBreadcrumb: (breadcrumb: unknown) => {
      calls.push({ method: "addBreadcrumb", args: [breadcrumb] });
    },
    browserTracingIntegration: () => ({ name: "browserTracing" }),
    replayIntegration: () => ({ name: "replay" }),
  };
  return { module, calls };
}

describe("createSentryClientConfig", () => {
  it("sanitizes transactions and logs through the registered outbound callbacks", async () => {
    const events = {
      transaction: {
        request: { url: "/upload-signature/synthetic-capability-canary" },
      },
      log: {
        message: "GET /reset-password?token=synthetic-capability-canary",
        attributes: { url: "/upload-signature/synthetic-capability-canary" },
      },
    };
    let sentTransaction: unknown;
    let sentLog: unknown;
    const { module } = createFakeSentry();
    const config = createSentryClientConfig({
      importModule: async () => ({
        ...module,
        init(options: {
          beforeSendTransaction?: (event: typeof events.transaction) => unknown;
          beforeSendLog?: (log: typeof events.log) => unknown;
        }) {
          sentTransaction = options.beforeSendTransaction
            ? options.beforeSendTransaction(events.transaction)
            : events.transaction;
          sentLog = options.beforeSendLog
            ? options.beforeSendLog(events.log)
            : events.log;
        },
      }),
      dsn: "https://example.sentry.io/dsn",
      getContext: () => null,
      applyContext: () => undefined,
    });
    config.initializeSentryClient();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sentTransaction).toBeDefined();
    expect(sentLog).toBeDefined();
    expect(JSON.stringify({ sentTransaction, sentLog })).not.toContain(
      "synthetic-capability-canary",
    );
  });

  it("initializes Sentry with the shared init options and applies context", async () => {
    const { module, calls } = createFakeSentry();
    const config = createSentryClientConfig<typeof module, { userId: string }>({
      importModule: async () => module,
      dsn: "https://example.sentry.io/dsn",
      getContext: () => ({ userId: "user-1" }),
      applyContext: (Sentry, context) => {
        Sentry.setUser({ id: context.userId });
        Sentry.setTag("role", "doctor");
      },
    });

    config.initializeSentryClient();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const initCall = calls.find((c) => c.method === "init");
    expect(initCall).toBeDefined();
    const options = initCall?.args[0] as Record<string, unknown>;
    expect(options["dsn"]).toBe("https://example.sentry.io/dsn");
    expect(options["tracesSampleRate"]).toBe(0.1);
    expect(options["sendDefaultPii"]).toBe(false);
    const ignoreErrors = options["ignoreErrors"] as Array<string | RegExp>;
    expect(ignoreErrors).toContain("ResizeObserver loop limit exceeded");
    expect(
      ignoreErrors.some((e) => e instanceof RegExp && e.test("ChunkLoadError")),
    ).toBe(true);
    expect(calls.some((c) => c.method === "setUser")).toBe(true);
    expect(calls.some((c) => c.method === "setTag")).toBe(true);
  });

  it("captures exceptions and messages through the loaded module", async () => {
    const { module, calls } = createFakeSentry();
    const config = createSentryClientConfig<typeof module, null>({
      importModule: async () => module,
      dsn: "https://example.sentry.io/dsn",
      getContext: () => null,
      applyContext: () => undefined,
    });

    config.initializeSentryClient();
    await new Promise((resolve) => setTimeout(resolve, 0));

    config.captureException(new Error("boom"), { type: "test" });
    config.captureMessage("hello", "error");

    await new Promise((resolve) => setTimeout(resolve, 0));

    const exceptionCall = calls.find((c) => c.method === "captureException");
    expect(exceptionCall?.args[0]).toBeInstanceOf(Error);
    expect(config.logger).toBeDefined();
  });

  it("is a silent no-op when Sentry is disabled (no DSN)", async () => {
    const { module, calls } = createFakeSentry();
    const config = createSentryClientConfig<typeof module, null>({
      importModule: async () => module,
      dsn: undefined,
      getContext: () => null,
      applyContext: () => undefined,
    });

    config.initializeSentryClient();
    config.captureException(new Error("never sent"));
    config.captureMessage("never sent");

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toHaveLength(0);
  });

  it("initializes only once even when called repeatedly", async () => {
    const { module, calls } = createFakeSentry();
    const config = createSentryClientConfig<typeof module, null>({
      importModule: async () => module,
      dsn: "https://example.sentry.io/dsn",
      getContext: () => null,
      applyContext: () => undefined,
    });

    config.initializeSentryClient();
    config.initializeSentryClient();
    config.initializeSentryClient();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const initCalls = calls.filter((c) => c.method === "init");
    expect(initCalls).toHaveLength(1);
  });
});
