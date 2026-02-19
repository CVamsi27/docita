import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const routerPush = vi.fn();
const routerReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

const loginMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    login: loginMock,
    isAuthenticated: false,
  }),
}));

import SuperAdminLogin from "./page";

describe("SuperAdminLogin", () => {
  it("shows field-level validation messages on empty submit", () => {
    render(<SuperAdminLogin />);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();

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
    render(<SuperAdminLogin />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });
});
