import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackButton } from "./back-button";

describe("BackButton", () => {
  it("renders default label and calls onBack when clicked", () => {
    const onBack = vi.fn();
    render(<BackButton onBack={onBack} />);

    const button = screen.getByRole("button", { name: /back/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");

    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders a custom label when provided", () => {
    render(<BackButton onBack={() => {}} label="Back to Patients" />);
    expect(
      screen.getByRole("button", { name: "Back to Patients" }),
    ).toBeInTheDocument();
  });

  it("renders icon-only with an accessible aria-label", () => {
    render(<BackButton onBack={() => {}} iconOnly ariaLabel="Go back" />);

    const button = screen.getByRole("button", { name: "Go back" });
    expect(button).toBeInTheDocument();
    expect(button.textContent?.trim()).toBe("");
  });

  it("respects the disabled prop", () => {
    const onBack = vi.fn();
    render(<BackButton onBack={onBack} disabled />);

    const button = screen.getByRole("button", { name: /back/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onBack).not.toHaveBeenCalled();
  });
});
