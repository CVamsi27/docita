import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

const toasterMock = vi.hoisted(() =>
  vi.fn((_props: Record<string, unknown>) => null),
);

vi.mock("sonner", () => ({
  Toaster: toasterMock,
}));

vi.mock("@/lib/auth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

describe("internal Providers", () => {
  beforeEach(() => {
    toasterMock.mockClear();
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
      duration: 7000,
      expand: true,
      richColors: true,
      position: "top-right",
      visibleToasts: Number.POSITIVE_INFINITY,
    });
  });
});
