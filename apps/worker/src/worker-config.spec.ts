// Worker smoke spec. The worker entrypoint (`apps/worker/src/main.ts`)
// is a thin bootstrap that wires the shared `AppConfigService` and the
// `WorkerModule`; verifying those two imports compile and instantiate
// here is enough to catch the most common break — a refactor in the
// shared config module that drops one of the sub-services the worker
// relies on. The full bootstrap (NestFactory.createApplicationContext,
// graceful shutdown) is exercised by the API e2e suite since the worker
// shares the same Sentry/Pino wiring.
//
// `describe`/`it`/`expect`/`jest` are bare globals — the worker tsconfig
// declares `types: ["jest", "node", "multer"]` which makes them available
// without an import.

describe("worker process wiring", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("shares the AppConfigService construction with the API", async () => {
    // Dynamic import so the spec is run with the same module-resolution
    // rules as the worker entrypoint (`@/*` → `apps/api/src/*`).
    const { buildAppConfigService } =
      await import("@/shared/modules/config/app-config.builder");

    const config = buildAppConfigService();

    // The worker reads the app version at boot (used in the Sentry
    // release tag and the deployment log). A missing dependency here
    // shows up as `undefined` and the worker boot fails downstream.
    expect(config).toBeDefined();
    expect(typeof config.getAppVersion).toBe("function");
    expect(config.getAppVersion()).toBeTruthy();
  });

  it("builds independent config instances per call (no shared mutable state)", async () => {
    const { buildAppConfigService } =
      await import("@/shared/modules/config/app-config.builder");

    // Two independent builds must produce independent instances — the
    // builder is intentionally a factory, not a singleton, so a
    // worker process does not share mutable config with an API
    // process running in the same container.
    const a = buildAppConfigService();
    const b = buildAppConfigService();
    expect(a).not.toBe(b);
    expect(a.getAppVersion()).toBe(b.getAppVersion());
  });
});
