/** Minimal shape of the Sentry client SDK methods the shared bootstrap helpers rely on. */
interface SentryExceptionCapturer {
  captureException: (error: unknown) => unknown;
}

export interface LazySentryClientLoaderOptions<TSentryModule> {
  /** Dynamic import of the Sentry SDK module, e.g. `() => import("@sentry/nextjs")`. */
  importModule: () => Promise<TSentryModule>;
  /** The DSN env value gating whether Sentry should ever be loaded (undefined/empty disables it). */
  dsn: string | undefined;
}

/**
 * Builds a lazily-loaded, memoized handle to the Sentry client SDK shared by
 * `apps/app` and `apps/internal`. Both apps defer importing `@sentry/nextjs`
 * until it's actually needed (and only when enabled — DSN present, browser,
 * not dev), then cache the loaded module/in-flight promise so repeated
 * `captureException`/`captureMessage`/init calls don't re-trigger the dynamic
 * import.
 *
 * Generic over the SDK module type so this stays free of an `@sentry/nextjs`
 * dependency in `@workspace/utils` — each app supplies its own
 * `typeof import("@sentry/nextjs")` type via the type parameter.
 */
export function createLazySentryClientLoader<TSentryModule>({
  importModule,
  dsn,
}: LazySentryClientLoaderOptions<TSentryModule>) {
  const isDev = process.env["NODE_ENV"] === "development";
  const isSentryEnabled = () =>
    typeof window !== "undefined" && Boolean(dsn) && !isDev;

  let sentryModule: TSentryModule | null = null;
  let sentryModulePromise: Promise<TSentryModule | null> | null = null;

  function getLoadedSentryModule(): TSentryModule | null {
    return sentryModule;
  }

  async function loadSentryModule(): Promise<TSentryModule | null> {
    if (!isSentryEnabled()) {
      return null;
    }

    if (sentryModule) return sentryModule;

    if (!sentryModulePromise) {
      sentryModulePromise = importModule()
        .then((module) => {
          sentryModule = module;
          return module;
        })
        .catch(() => null);
    }

    return sentryModulePromise;
  }

  /**
   * Runs `action` against the already-loaded module synchronously when
   * available, otherwise lazily loads it first. Shared by the best-effort
   * `captureMessage`/`addBreadcrumb`-style helpers that don't need to return
   * a value back to the caller.
   */
  function runWithSentryModule(action: (Sentry: TSentryModule) => void): void {
    const loadedModule = getLoadedSentryModule();
    if (loadedModule) {
      action(loadedModule);
      return;
    }

    void loadSentryModule().then((Sentry) => {
      if (Sentry) action(Sentry);
    });
  }

  return {
    isSentryEnabled,
    getLoadedSentryModule,
    loadSentryModule,
    runWithSentryModule,
  };
}

/**
 * Wires a single `unhandledrejection` listener that forwards the rejection to
 * Sentry as a captured exception. Identical across `apps/app` and
 * `apps/internal` client bootstraps, so it lives here once.
 */
export function wireUnhandledRejectionCapture<
  TSentryModule extends SentryExceptionCapturer,
>(Sentry: TSentryModule): void {
  window.addEventListener("unhandledrejection", (event) => {
    Sentry.captureException(
      new Error(
        `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
      ),
    );
  });
}

export interface SentryClientBootstrapOptions<TSentryModule, TContext> {
  /** The memoized loader returned by `createLazySentryClientLoader`. */
  loadSentryModule: () => Promise<TSentryModule | null>;
  /** Reads the app-specific user/admin context (e.g. from session storage). */
  getContext: () => TContext | null;
  /** Applies the resolved context to the loaded Sentry module (setUser/setTag/...). */
  applyContext: (Sentry: TSentryModule, context: TContext) => void;
  /** Optional hook fired once bootstrap finishes successfully (e.g. mark a ready flag). */
  onReady?: (Sentry: TSentryModule) => void;
}

/**
 * Shared client bootstrap sequence: lazily loads the SDK, applies the
 * app-specific user context, wires global unhandled-rejection capture, and
 * (optionally) signals readiness — all guarded by a best-effort try/catch so
 * monitoring setup can never block app boot.
 *
 * `apps/app` and `apps/internal` differ only in *what* context they read and
 * *which* tags they set, both of which are supplied via `getContext` /
 * `applyContext`.
 */
export function bootstrapSentryClient<
  TSentryModule extends SentryExceptionCapturer,
  TContext,
>({
  loadSentryModule,
  getContext,
  applyContext,
  onReady,
}: SentryClientBootstrapOptions<TSentryModule, TContext>): void {
  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    try {
      const context = getContext();
      if (context) {
        applyContext(Sentry, context);
      }

      wireUnhandledRejectionCapture(Sentry);

      onReady?.(Sentry);
    } catch {
      // Client-side monitoring must never block app boot.
    }
  });
}
