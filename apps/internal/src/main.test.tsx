import { act, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Button } from "@workspace/ui/components/form/button";

const state = vi.hoisted(() => ({ roots: [] as Root[] }));
vi.mock("react-dom/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-dom/client")>();
  return {
    ...original,
    createRoot: (...args: Parameters<typeof original.createRoot>) => {
      const root = original.createRoot(...args);
      state.roots.push(root);
      return root;
    },
  };
});
vi.mock("@/lib/monitoring/sentry.client.config", () => ({
  initializeSentryClient: vi.fn(),
}));
vi.mock("@/lib/monitoring/client-error-reporter", () => ({
  installGlobalErrorHandler: vi.fn(),
}));
vi.mock("@/lib/monitoring/web-vitals", () => ({
  installWebVitalsReporter: vi.fn(),
}));
vi.mock("@/lib/monitoring/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/components/layout/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/layout/api-availability-gate", () => ({
  ApiAvailabilityGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/lib/auth/auth-provider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./App", () => ({
  default: () => (
    <SymbolTooltip label="Change appearance">
      <Button>Theme</Button>
    </SymbolTooltip>
  ),
}));

afterEach(() => {
  act(() => state.roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

it("boots shared tooltip controls inside the real entrypoint provider tree", async () => {
  const container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  await act(async () => {
    await import("./main");
  });
  expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
}, 15_000);
