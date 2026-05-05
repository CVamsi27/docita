import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MicroLabel } from "./micro-label";

describe("MicroLabel", () => {
  it("renders content inside a span by default", () => {
    render(<MicroLabel>Net worth</MicroLabel>);
    const node = screen.getByText("Net worth");
    expect(node.tagName).toBe("SPAN");
    expect(node.className).toMatch(/uppercase/);
    expect(node.className).toMatch(/tracking-wide/);
  });

  it("respects the `as` prop", () => {
    render(<MicroLabel as="h2">Section</MicroLabel>);
    const heading = screen.getByRole("heading", { level: 2, name: /section/i });
    expect(heading.tagName).toBe("H2");
  });
});
