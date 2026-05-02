import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocitaLoadingIndicator } from "./docita-loading-indicator";

describe("DocitaLoadingIndicator", () => {
  it("exposes status role for page variant by default", () => {
    render(<DocitaLoadingIndicator variant="page" aria-label="Please wait" />);
    expect(
      screen.getByRole("status", { name: "Please wait" }),
    ).toBeInTheDocument();
  });

  it("omits status role when withStatusRole is false", () => {
    render(
      <div role="status" aria-label="Outer">
        <DocitaLoadingIndicator variant="page" withStatusRole={false} />
      </div>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("does not expose status when inline and decorative", () => {
    render(<DocitaLoadingIndicator variant="inline" decorative />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
