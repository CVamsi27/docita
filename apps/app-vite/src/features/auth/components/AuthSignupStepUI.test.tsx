import { fireEvent, screen } from "@testing-library/react";
import { renderWithTooltip as render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi } from "vitest";
import { AuthSignupStepUI } from "./AuthSignupStepUI";

const baseProps = {
  email: "owner@clinic.com",
  firstName: "Jane",
  lastName: "Doe",
  password: "Password@123",
  confirmPassword: "Password@123",
  ownerRole: null,
  showPassword: false,
  fieldErrors: {},
  loading: false,
  error: "",
  onBack: () => {},
  onChangeFirstName: () => {},
  onChangeLastName: () => {},
  onChangePassword: () => {},
  onChangeConfirmPassword: () => {},
  onTogglePassword: () => {},
  onSubmit: () => {},
  siteKey: "",
  turnstileError: null,
  onTurnstileToken: () => {},
  onTurnstileExpire: () => {},
};

describe("AuthSignupStepUI", () => {
  it("renders a usage-based owner account question", () => {
    render(
      <AuthSignupStepUI
        {...baseProps}
        onChangeOwnerRole={() => {}}
      />,
    );

    expect(
      screen.getByText("Will you personally treat patients with this account?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /yes, i'll also see patients/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /no, i'll only manage the facility/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" }),
    ).toBeDisabled();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("updates the selected owner role when a card is chosen", () => {
    const onChangeOwnerRole = vi.fn();

    render(
      <AuthSignupStepUI
        {...baseProps}
        onChangeOwnerRole={onChangeOwnerRole}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: /yes, i'll also see patients/i }),
    );

    expect(onChangeOwnerRole).toHaveBeenCalledWith("ADMIN_DOCTOR");
  });

  it("renders the Turnstile verification error when a site key is configured", () => {
    render(
      <AuthSignupStepUI
        {...baseProps}
        siteKey="test-site-key"
        turnstileError="Please complete the security verification before creating your account."
        onChangeOwnerRole={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Please complete the security verification before creating your account.",
      ),
    ).toBeInTheDocument();
  });
});
