import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("defaults native buttons to type=button", () => {
    render(<Button>Action</Button>);

    expect(screen.getByRole("button", { name: "Action" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("preserves an explicit submit type", () => {
    render(<Button type="submit">Submit</Button>);

    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
