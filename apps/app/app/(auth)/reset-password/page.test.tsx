import { fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "./page";

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
  apiPost: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/api/api-client", () => ({
  api: {
    post: (...args: unknown[]) => mocks.apiPost(...args),
  },
}));

vi.mock("@/lib/monitoring/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mocks.loggerError(...args),
  },
}));

vi.mock("@/features/auth/components/PreDashboardShell", () => ({
  PreDashboardShell: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mocks.searchParams.get.mockReset();
    mocks.apiPost.mockReset();
    mocks.loggerError.mockReset();
    mocks.searchParams.get.mockImplementation((key: string) =>
      key === "token" ? "reset-token" : null,
    );
  });

  it("shows required messages for blank password fields", async () => {
    render(<ResetPasswordPage />);

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(await screen.findByText("Enter new password")).toBeInTheDocument();
    expect(screen.getByText("Confirm password")).toBeInTheDocument();
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });
});
