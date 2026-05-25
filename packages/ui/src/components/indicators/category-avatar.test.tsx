import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CategoryAvatar } from "./category-avatar";

describe("CategoryAvatar", () => {
  it("renders icon with aria-label when provided", () => {
    render(
      <CategoryAvatar
        icon={<span data-testid="ico" />}
        ariaLabel="Lab category"
      />,
    );
    const node = screen.getByRole("img", { name: /lab category/i });
    expect(node).toBeInTheDocument();
    expect(screen.getByTestId("ico")).toBeInTheDocument();
  });

  it("hides itself from a11y when no aria-label is provided", () => {
    render(<CategoryAvatar icon={<span data-testid="ico" />} />);
    expect(screen.getByTestId("ico").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
