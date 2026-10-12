import type { ReactNode } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Boot-order regression for the API outage gate.
 *
 * The gate lives inside the lazily loaded route tree, so its boot effect runs a
 * commit after the providers above it — by which time their boot requests are
 * already in flight against a hung API, and the outage screen appears only once
 * the probe is finally issued. `main.tsx` therefore starts the check before
 * React renders; this spec loads the real entry module against a hung `fetch`
 * and asserts the readiness probe is the app's first request.
 */

const fetchSpy = vi.hoisted(() =>
  vi.fn(
    (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Promise<Response>(() => {}),
  ),
);

/** Passthrough stand-ins for the providers that issue no boot traffic. */
function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

vi.mock("@workspace/ui/styles/globals.css", () => ({}));
vi.mock("@/providers/react-query-provider", () => ({
  ReactQueryProvider: Passthrough,
}));
vi.mock("@/providers/data-access-bridge", () => ({
  DataAccessBridge: Passthrough,
}));
vi.mock("@/components/layout/providers", () => ({
  AppProviders: Passthrough,
}));
vi.mock("@/components/layout/theme-provider", () => ({
  ThemeProvider: Passthrough,
}));
vi.mock("@/lib/socket", () => ({
  SocketProvider: Passthrough,
}));
vi.mock("@/i18n/provider", () => ({
  I18nProvider: Passthrough,
}));
vi.mock("@workspace/ui/components/feedback/error-boundary", () => ({
  ErrorBoundary: Passthrough,
}));
vi.mock("@/components/pwa/pwa-register", () => ({
  PwaRegister: () => null,
}));
vi.mock("@/lib/monitoring/sentry.client.config", () => ({
  initializeSentryClient: vi.fn(),
}));
vi.mock("@/lib/monitoring/client-error-reporter", () => ({
  installGlobalErrorHandler: vi.fn(),
}));
vi.mock("@/lib/monitoring/web-vitals", () => ({
  installWebVitalsReporter: vi.fn(),
}));

/** Stands in for a provider whose session bootstrap fires a request on mount. */
vi.mock("@/lib/auth/auth-provider", async () => {
  const { useEffect: useBootEffect } = await import("react");
  return {
    AuthProvider: function AuthProvider({ children }: { children: ReactNode }) {
      useBootEffect(() => {
        void fetch("/api/v1/auth/session", { credentials: "include" });
      }, []);
      return <>{children}</>;
    },
  };
});

/**
 * Mounts the real gate the way `root-layout.tsx` does, but only after the
 * first commit — standing in for the lazy route chunk `App` waits on. That
 * delay is why the gate's own boot effect cannot be the first probe: the
 * providers above it request data while the gate is not mounted yet.
 */
vi.mock("./App", async () => {
  const { useEffect: useMountEffect, useState } = await import("react");
  const { ApiAvailabilityGate } =
    await import("@/components/layout/api-availability-gate");
  return {
    default: function App() {
      const [isReady, setIsReady] = useState(false);
      useMountEffect(() => {
        setIsReady(true);
      }, []);

      if (!isReady) return null;

      return (
        <ApiAvailabilityGate>
          <p>workspace</p>
        </ApiAvailabilityGate>
      );
    },
  };
});

describe("app entry module", () => {
  it("starts the availability probe before any provider issues a request", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.stubEnv("VITE_API_URL", "/api/v1");
    vi.stubGlobal("fetch", fetchSpy);

    await act(async () => {
      await import("./main");
    });

    expect(await screen.findByText("workspace")).toBeInTheDocument();

    const requested = await waitFor(() => {
      const calls = fetchSpy.mock.calls.map(([input]) => String(input));
      expect(calls).toContain("/api/v1/auth/session");
      return calls;
    });

    expect(requested[0]).toContain("/api/health/ready");
    expect(requested.indexOf("/api/v1/auth/session")).toBeGreaterThan(0);
  });
});
