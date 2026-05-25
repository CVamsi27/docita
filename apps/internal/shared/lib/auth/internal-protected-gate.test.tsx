import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InternalProtectedGate } from "./internal-protected-gate";

const replaceMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/auth/auth", () => ({
  useAuth: () => useAuthMock(),
}));

describe("InternalProtectedGate", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      isInternal: true,
    });
  });

  it("renders children for authenticated internal users", () => {
    render(
      <InternalProtectedGate>
        <p>Protected content</p>
      </InternalProtectedGate>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", () => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      isInternal: false,
    });

    render(
      <InternalProtectedGate>
        <p>Protected content</p>
      </InternalProtectedGate>,
    );

    expect(replaceMock).toHaveBeenCalledWith("/");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
