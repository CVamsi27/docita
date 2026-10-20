import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const items = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function renderSingleGroup(options?: {
  value?: string;
  onValueChange?: (value: string | string[]) => void;
  disabledValue?: string;
}) {
  return render(
    <ToggleGroup
      role="group"
      aria-label="Billing period"
      type="single"
      value={options?.value}
      onValueChange={options?.onValueChange}
    >
      {items.map((item) => (
        <ToggleGroupItem
          key={item.value}
          value={item.value}
          disabled={item.value === options?.disabledValue}
        >
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>,
  );
}

describe("ToggleGroup", () => {
  it("marks the selected item as pressed", () => {
    renderSingleGroup({ value: "yearly" });

    expect(screen.getByRole("button", { name: "Yearly" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the selected value through onValueChange", () => {
    const onValueChange = vi.fn();
    renderSingleGroup({ value: "monthly", onValueChange });

    fireEvent.click(screen.getByRole("button", { name: "Yearly" }));

    expect(onValueChange).toHaveBeenCalledWith("yearly");
  });

  it("selects items in uncontrolled mode", () => {
    render(
      <ToggleGroup type="single" defaultValue="monthly">
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yearly" }));

    expect(screen.getByRole("button", { name: "Yearly" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("ignores clicks on disabled items", () => {
    const onValueChange = vi.fn();
    renderSingleGroup({
      value: "monthly",
      onValueChange,
      disabledValue: "yearly",
    });

    fireEvent.click(screen.getByRole("button", { name: "Yearly" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("toggles values independently in multiple mode", () => {
    const onValueChange = vi.fn();
    render(
      <ToggleGroup
        type="multiple"
        value={["monthly"]}
        onValueChange={onValueChange}
      >
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yearly" }));

    expect(onValueChange).toHaveBeenCalledWith(["monthly", "yearly"]);
  });

  it("forwards group labelling props to the container", () => {
    renderSingleGroup({ value: "monthly" });

    expect(
      screen.getByRole("group", { name: "Billing period" }),
    ).toBeInTheDocument();
  });
});
