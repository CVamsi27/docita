import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

const toasterMock = vi.hoisted(() =>
  vi.fn((_props: Record<string, unknown>) => null),
);
const themeProviderMock = vi.hoisted(() =>
  vi.fn(({ children }: { children: ReactNode; nonce?: string }) => children),
);

vi.mock("sonner", () => ({
  Toaster: toasterMock,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({
    children,
    nonce,
  }: {
    children: ReactNode;
    nonce?: string;
  }) => themeProviderMock({ children, nonce }),
}));

vi.mock("@/lib/auth/auth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

describe("internal Providers", () => {
  beforeEach(() => {
    toasterMock.mockClear();
    themeProviderMock.mockClear();
  });

  it("keeps stacked messages expanded and individually dismissible", () => {
    render(
      <Providers>
        <div>Internal app</div>
      </Providers>,
    );

    expect(screen.getByText("Internal app")).toBeInTheDocument();
    expect(toasterMock.mock.calls.at(-1)?.[0]).toMatchObject({
      closeButton: true,
      duration: 5000,
      expand: true,
      richColors: true,
      position: "top-right",
      visibleToasts: Number.POSITIVE_INFINITY,
    });
  });

  it("passes the request nonce to next-themes", () => {
    render(
      <Providers nonce="nonce-from-layout">
        <div>Internal app</div>
      </Providers>,
    );

    expect(themeProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: "nonce-from-layout",
      }),
    );
  });
});
