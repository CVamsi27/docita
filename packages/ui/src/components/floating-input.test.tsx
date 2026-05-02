import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FloatingInput } from "./floating-input";

describe("FloatingInput", () => {
  it("renders the label and connects it to the input via id", () => {
    render(<FloatingInput id="email" label="Email Address" />);
    const input = screen.getByLabelText("Email Address");
    expect(input).toHaveAttribute("id", "email");
  });

  it("updates the displayed value as the user types", () => {
    render(<FloatingInput id="email" label="Email" />);
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "doc@example.com" } });
    expect(input.value).toBe("doc@example.com");
  });

  it("renders an error message when errorText is provided", () => {
    render(
      <FloatingInput
        id="email"
        label="Email"
        errorText="Please enter a valid email"
      />,
    );
    expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
  });

  it("renders a trailing slot (for example, a password eye toggle)", () => {
    render(
      <FloatingInput
        id="password"
        label="Password"
        type="password"
        trailing={
          <button type="button" aria-label="Toggle password visibility">
            eye
          </button>
        }
      />,
    );
    expect(
      screen.getByRole("button", { name: /toggle password visibility/i }),
    ).toBeInTheDocument();
  });
});
