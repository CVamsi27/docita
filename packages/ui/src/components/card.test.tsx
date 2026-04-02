import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, InteractiveCard } from "./card";

describe("Card", () => {
  it("renders static card by default", () => {
    const { container } = render(<Card>content</Card>);
    const card = container.firstChild;

    expect(card).toHaveClass("shadow-sm");
    expect(card).toHaveClass("transition-colors");
    expect(card).not.toHaveClass("cursor-pointer");
  });

  it("renders interactive card variant", () => {
    const { container } = render(<InteractiveCard>content</InteractiveCard>);
    const card = container.firstChild;

    expect(card).toHaveClass("cursor-pointer");
    expect(card).toHaveClass("hover:shadow-md");
  });
});
