import { screen } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it } from "vitest";
import { AuthLoginStepUI } from "./AuthLoginStepUI";

describe("AuthLoginStepUI", () => {
  it("disables sign in while the account is locked", () => {
    render(
      <AuthLoginStepUI
        email="doctor@example.com"
        password="password123"
        showPassword={false}
        fieldErrors={{}}
        loading={false}
        error=""
        isLocked
        lockoutMessage="Account is locked due to too many failed login attempts. Try again in 15 minute(s)."
        onBack={() => {}}
        onChangePassword={() => {}}
        onTogglePassword={() => {}}
        onSubmit={() => {}}
        onForgotPassword={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Account is locked due to too many failed login attempts. Try again in 15 minute(s).",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeDisabled();
  });
});
