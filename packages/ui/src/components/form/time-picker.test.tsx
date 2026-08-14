import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimePicker } from "./time-picker";

describe("TimePicker", () => {
  it("renders the placeholder when no value is set", () => {
    render(<TimePicker placeholder="Pick a time" />);
    expect(screen.getByRole("button", { name: /Pick a time/ })).toBeInTheDocument();
  });

  it("renders the selected value formatted as 12-hour time by default", () => {
    render(<TimePicker value="14:30" />);
    expect(screen.getByRole("button", { name: "2:30 PM" })).toBeInTheDocument();
  });

  it("renders the selected value formatted as 24-hour time when use12Hour is false", () => {
    render(<TimePicker value="14:30" use12Hour={false} />);
    expect(screen.getByRole("button", { name: "14:30" })).toBeInTheDocument();
  });

  it("invokes onChange with the selected HH:mm string when a slot is clicked", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker
        value="08:00"
        onChange={handleChange}
        startHour={8}
        endHour={9}
        stepMinutes={30}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "8:00 AM" }));

    const eightThirty = screen.getByRole("option", { name: "8:30 AM" });
    fireEvent.click(eightThirty);

    expect(handleChange).toHaveBeenCalledWith("08:30");
  });

  it("marks the currently selected slot with aria-selected=true", () => {
    render(
      <TimePicker
        value="08:30"
        startHour={8}
        endHour={9}
        stepMinutes={30}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "8:30 AM" }));

    const selected = screen.getByRole("option", { name: "8:30 AM" });
    expect(selected).toHaveAttribute("aria-selected", "true");

    const notSelected = screen.getByRole("option", { name: "8:00 AM" });
    expect(notSelected).toHaveAttribute("aria-selected", "false");
  });

  it("renders only slots inside the configured hour range", () => {
    render(<TimePicker startHour={8} endHour={9} stepMinutes={30} />);
    fireEvent.click(screen.getByRole("button", { name: /Select time/ }));

    expect(screen.getByRole("option", { name: "8:00 AM" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "8:30 AM" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "9:00 AM" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "7:30 AM" })).toBeNull();
    expect(screen.queryByRole("option", { name: "10:00 AM" })).toBeNull();
  });
});
