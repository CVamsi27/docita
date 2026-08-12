import { screen } from "@testing-library/react";
import { renderWithTooltip as render } from "@/test-utils/render-with-tooltip";
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
        siteKey=""
        turnstileError={null}
        onTurnstileToken={() => {}}
        onTurnstileExpire={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Account is locked due to too many failed login attempts. Try again in 15 minute(s).",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("renders the Turnstile widget and its error when a site key is configured", () => {
    render(
      <AuthLoginStepUI
        email="doctor@example.com"
        password="password123"
        showPassword={false}
        fieldErrors={{}}
        loading={false}
        error=""
        isLocked={false}
        lockoutMessage=""
        onBack={() => {}}
        onChangePassword={() => {}}
        onTogglePassword={() => {}}
        onSubmit={() => {}}
        onForgotPassword={() => {}}
        siteKey="test-site-key"
        turnstileError="Please complete the security verification before signing in."
        onTurnstileToken={() => {}}
        onTurnstileExpire={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Please complete the security verification before signing in.",
      ),
    ).toBeInTheDocument();
  });
});
