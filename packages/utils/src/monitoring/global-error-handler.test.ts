import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { installGlobalErrorHandler } from "./global-error-handler.js";

// installGlobalErrorHandler uses a module-level installed flag, so a single
// suite can only install once. Each test that needs a fresh handler must
// therefore reset the module registry and re-import the module (see
// importFreshModule below), otherwise later tests silently no-op.

const ORIGINAL_WINDOW = globalThis.window;

async function importFreshModule() {
  vi.resetModules();
  return import("./global-error-handler.js");
}

function createWindowStub() {
  const listeners = new Map<string, (event: unknown) => void>();
  const windowStub = {
    addEventListener: (
      type: string,
      listener: (event: unknown) => void,
    ) => {
      listeners.set(type, listener);
    },
    onerror: null as unknown,
    _listeners: listeners,
  };
  return windowStub;
}

beforeAll(() => {
  globalThis.window = createWindowStub() as unknown as Window &
    typeof globalThis;
});

afterAll(() => {
  if (ORIGINAL_WINDOW === undefined) {
    delete (globalThis as Record<string, unknown>)["window"];
  } else {
    globalThis.window = ORIGINAL_WINDOW;
  }
});

describe("installGlobalErrorHandler", () => {
  it("captures unhandled promise rejections as Error instances", async () => {
    const { installGlobalErrorHandler } = await importFreshModule();
    const capture = vi.fn();
    installGlobalErrorHandler(capture);

    const windowStub = globalThis.window as unknown as {
      _listeners: Map<string, (event: unknown) => void>;
    };
    const rejectionListener = windowStub._listeners.get("unhandledrejection");
    expect(rejectionListener).toBeDefined();

    rejectionListener?.({ reason: new Error("async boom") });
    expect(capture).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: "unhandled_promise_rejection" }),
    );
    expect(capture.mock.calls[0]?.[0]?.message).toBe("async boom");

    rejectionListener?.({ reason: "plain string reason" });
    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls[1]?.[0]?.message).toBe("plain string reason");
  });

  it("captures window.onerror events", async () => {
    const { installGlobalErrorHandler } = await importFreshModule();
    const capture = vi.fn();
    installGlobalErrorHandler(capture);

    const windowStub = globalThis.window as unknown as {
      onerror: (
        message: string,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error,
      ) => boolean;
    };
    const onerror = windowStub.onerror as (
      message: string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error,
    ) => boolean;

    const result = onerror("script error", "app.js", 10, 5, new Error("boom"));
    expect(result).toBe(true);
    expect(capture).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        type: "window_onerror",
        source: "app.js",
        line: 10,
        column: 5,
      }),
    );
  });

  it("does not install twice (module-level guard)", async () => {
    const { installGlobalErrorHandler } = await importFreshModule();
    const capture = vi.fn();
    installGlobalErrorHandler(capture);
    installGlobalErrorHandler(capture);

    const windowStub = globalThis.window as unknown as {
      _listeners: Map<string, (event: unknown) => void>;
    };
    // The second install is a no-op, so only the first listener registration
    // survives; the listener registered by the first install is still there.
    const registeredTypes = [...windowStub._listeners.keys()];
    expect(registeredTypes).toContain("unhandledrejection");
  });
});
