import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAIN_APP_URL } from "@/lib/api/api-config";

const clientPostMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const locationReplaceMock = vi.hoisted(() => vi.fn());

const routerPush = vi.fn();
const routerReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

const loginMock = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  useAuth: () => ({
    login: loginMock,
    isAuthenticated: false,
  }),
}));

vi.mock("@/lib/api/api-client", () => ({
  client: {
    post: clientPostMock,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => (
    <button type="button" aria-label="Toggle theme">
      Toggle theme
    </button>
  ),
}));

import InternalLogin from "./page";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("InternalLogin", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerReplace.mockReset();
    loginMock.mockReset();
    clientPostMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    locationReplaceMock.mockReset();
    const originalLocation = window.location;
    const mockWindow = window as unknown as {
      location?: Location & { replace: typeof locationReplaceMock };
    };
    delete mockWindow.location;
    mockWindow.location = {
      ...originalLocation,
      replace: locationReplaceMock,
    };
  });

  it("shows field-level validation messages on empty submit", () => {
    renderWithQueryClient(<InternalLogin />);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Enter an email address")).toBeInTheDocument();
    expect(screen.getByText("Enter a password")).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows email format message for invalid email", () => {
    renderWithQueryClient(<InternalLogin />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("routes internal users to the internal dashboard after login", async () => {
    clientPostMock.mockResolvedValueOnce({
      access_token: "token",
      user: {
        id: "1",
        name: "Internal User",
        email: "internal@test.com",
        role: "INTERNAL",
      },
    });

    renderWithQueryClient(<InternalLogin />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "internal@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("token", {
        id: "1",
        name: "Internal User",
        email: "internal@test.com",
        role: "INTERNAL",
      });
      expect(routerPush).not.toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Login successful");
    });
  });

  it("redirects non-internal users to the main app", async () => {
    clientPostMock.mockResolvedValueOnce({
      access_token: "token",
      user: {
        id: "2",
        name: "Clinic Admin",
        email: "admin@test.com",
        role: "ADMIN",
      },
    });

    renderWithQueryClient(<InternalLogin />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(locationReplaceMock).toHaveBeenCalledWith(
        `${MAIN_APP_URL.replace(/\/$/, "")}/login`,
      );
    });

    expect(loginMock).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });
});
