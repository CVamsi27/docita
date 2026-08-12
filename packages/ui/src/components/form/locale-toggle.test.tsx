import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleToggle } from "./locale-toggle";

describe("LocaleToggle", () => {
  it("renders EN and हिंदी buttons with the active locale pressed", () => {
    render(<LocaleToggle locale="en" onLocaleChange={vi.fn()} />);

    const en = screen.getByRole("button", { name: "EN" });
    const hi = screen.getByRole("button", { name: "हिंदी" });
    expect(en).toHaveAttribute("aria-pressed", "true");
    expect(hi).toHaveAttribute("aria-pressed", "false");
  });

  it("marks हिंदी pressed when the locale is hi", () => {
    render(<LocaleToggle locale="hi" onLocaleChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "हिंदी" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("fires onLocaleChange with the requested locale on click", () => {
    const onChange = vi.fn();
    render(<LocaleToggle locale="en" onLocaleChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(onChange).toHaveBeenCalledWith("hi");

    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(onChange).toHaveBeenCalledWith("en");
  });
});
