import { fireEvent, screen } from "@testing-library/react";
import { renderWithTooltip as render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi } from "vitest";

import { AuthEmailStepUI } from "./AuthEmailStepUI";

describe("AuthEmailStepUI", () => {
  it("renders the email field and the continue button", () => {
    render(
      <AuthEmailStepUI
        email=""
        fieldErrors={{}}
        loading={false}
        error=""
        onChangeEmail={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
  });

  it("renders the error banner when a non-field error is present", () => {
    render(
      <AuthEmailStepUI
        email="doctor@example.com"
        fieldErrors={{}}
        loading={false}
        error="We could not reach our servers. Please try again."
        onChangeEmail={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/We could not reach our servers/i),
    ).toBeInTheDocument();
  });

  it("suppresses the error banner when a field error is present (the inline field error takes precedence)", () => {
    render(
      <AuthEmailStepUI
        email="not-an-email"
        fieldErrors={{ email: "Enter a valid email" }}
        loading={false}
        error="We could not reach our servers"
        onChangeEmail={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/We could not reach our servers/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Enter a valid email/i),
    ).toBeInTheDocument();
  });

  it("disables the submit button and shows the checking state while loading", () => {
    render(
      <AuthEmailStepUI
        email="doctor@example.com"
        fieldErrors={{}}
        loading
        error=""
        onChangeEmail={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: /checking/i });
    expect(button).toBeDisabled();
  });

  it("invokes the onChangeEmail handler when the user types in the email field", () => {
    const onChangeEmail = vi.fn();
    render(
      <AuthEmailStepUI
        email=""
        fieldErrors={{}}
        loading={false}
        error=""
        onChangeEmail={onChangeEmail}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new@example.com" },
    });
    expect(onChangeEmail).toHaveBeenCalledWith("new@example.com");
  });

  it("invokes the onSubmit handler when the user submits the form", () => {
    const onSubmit = vi.fn();
    render(
      <AuthEmailStepUI
        email="doctor@example.com"
        fieldErrors={{}}
        loading={false}
        error=""
        onChangeEmail={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
