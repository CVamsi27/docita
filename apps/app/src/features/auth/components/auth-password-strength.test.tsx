import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordStrengthIndicator } from "./auth-password-strength";

describe("PasswordStrengthIndicator", () => {
  it("returns null for empty password", () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows Weak for password with only lowercase (score 1)", () => {
    render(<PasswordStrengthIndicator password="a" />);
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("shows Fair for password with length >= 8 and lowercase (score 2)", () => {
    render(<PasswordStrengthIndicator password="abcdefgh" />);
    expect(screen.getByText("Fair")).toBeInTheDocument();
  });

  it("shows Good for password with length, upper + lower case (score 3)", () => {
    render(<PasswordStrengthIndicator password="Abcdefgh" />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows Strong for password with length, upper, lower, number (score 4)", () => {
    render(<PasswordStrengthIndicator password="Abcd1234" />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("shows Very strong for password with all 5 criteria (score 5)", () => {
    render(<PasswordStrengthIndicator password="Abcd@123" />);
    expect(screen.getByText("Very strong")).toBeInTheDocument();
  });
});
