import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

const themeProviderMock = vi.hoisted(() =>
  vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
);

vi.mock("next-themes", () => ({
  ThemeProvider: ({
    children,
    nonce,
  }: {
    children: ReactNode;
    nonce?: string;
  }) => themeProviderMock({ children, nonce }),
}));

vi.mock("@/lib/contexts/socket-context", () => ({
  SocketProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/contexts/app-config-context", () => ({
  AppConfigProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-confirm", () => ({
  ConfirmProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@workspace/ui/components/overlay/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@workspace/ui/components/overlay/dialog-stack", () => ({
  DialogStackProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/providers/navigation-history-provider", () => ({
  NavigationHistoryProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/layout/appearance-controller", () => ({
  AppearanceController: () => null,
}));

describe("app Providers", () => {
  beforeEach(() => {
    themeProviderMock.mockClear();
  });

  it("passes the request nonce to next-themes", () => {
    renderToStaticMarkup(
      <Providers nonce="nonce-from-layout">
        <div>App</div>
      </Providers>,
    );

    expect(themeProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: "nonce-from-layout",
      }),
    );
  });
});
