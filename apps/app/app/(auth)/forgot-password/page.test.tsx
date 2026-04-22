import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./page";

const mocks = vi.hoisted(() => ({
  searchParams: {
    get: vi.fn(),
  },
  router: {
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/features/auth/components/PreDashboardShell", () => ({
  PreDashboardShell: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mocks.searchParams.get.mockReset();
  });

  it("prefills the email input from the query string", () => {
    mocks.searchParams.get.mockReturnValue("typed@example.com");

    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      "typed@example.com",
    );
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
  });
});
