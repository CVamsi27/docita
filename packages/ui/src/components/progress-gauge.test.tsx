import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressGauge } from "./progress-gauge";

describe("ProgressGauge", () => {
  it("clamps the value to 0..100 and reports as a progressbar", () => {
    render(<ProgressGauge value={1.5} ariaLabel="Used" />);
    const node = screen.getByRole("progressbar", { name: /used/i });
    expect(node).toHaveAttribute("aria-valuenow", "100");
  });

  it("rounds the value to the nearest percent", () => {
    render(<ProgressGauge value={0.626} ariaLabel="Used" />);
    const node = screen.getByRole("progressbar", { name: /used/i });
    expect(node).toHaveAttribute("aria-valuenow", "63");
  });
});
