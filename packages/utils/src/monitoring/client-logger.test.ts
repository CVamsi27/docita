import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSentryLogger } from "./client-logger.js";

// The loader treats NODE_ENV=development as "Sentry disabled" and the
// logger's isSentryEnabled() reads process.env at creation time, so the
// enabled-path assertions need a non-dev NODE_ENV regardless of how the
// suite is invoked (a dev shell often exports NODE_ENV=development).
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
  const breadcrumbs: unknown[] = [];
  const messages: { message: string; options?: unknown }[] = [];
  const module = {
    addBreadcrumb: (breadcrumb: unknown) => {
      breadcrumbs.push(breadcrumb);
    },
    captureMessage: (message: string, options?: unknown) => {
      messages.push({ message, options });
    },
  };
  return { module, breadcrumbs, messages };
}

describe("createSentryLogger", () => {
  it("records breadcrumbs and captures warn/error messages through the loaded module", async () => {
    const { module, breadcrumbs, messages } = createFakeSentry();
    const logger = createSentryLogger({
      importModule: async () => module,
      dsn: "https://example.sentry.io/dsn",
    });

    logger.info("info message", { key: "value" });
    logger.warn("warn message");
    logger.error("error message", "string-context");

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs[0]).toEqual({
      category: "logger",
      level: "info",
      message: "info message",
      data: { key: "value" },
    });
    expect(messages.map((m) => m.message)).toEqual([
      "warn message",
      "error message",
    ]);
    const warningOptions = messages[0]?.options;
    expect(warningOptions).toEqual({ level: "warning" });
    const errorOptions = messages[1]?.options;
    expect(errorOptions).toEqual({
      level: "error",
      extra: { value: "string-context" },
    });
  });

  it("is a silent no-op when Sentry is disabled (no DSN)", () => {
    const { module, breadcrumbs, messages } = createFakeSentry();
    const logger = createSentryLogger({
      importModule: async () => module,
      dsn: undefined,
    });

    logger.error("never sent");

    expect(breadcrumbs).toHaveLength(0);
    expect(messages).toHaveLength(0);
  });

  it("degrades gracefully when the module import fails", async () => {
    const logger = createSentryLogger({
      importModule: async () => {
        throw new Error("sentry unavailable");
      },
      dsn: "https://example.sentry.io/dsn",
    });

    expect(() => logger.error("boom")).not.toThrow();
    await Promise.resolve();
  });
});
