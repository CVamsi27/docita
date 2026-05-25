import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionHeading } from "./section-heading";

describe("SectionHeading", () => {
  it("renders a page-sized heading with description", () => {
    render(
      <SectionHeading
        size="page"
        title="Dashboard"
        description="Operational summary"
      />,
    );

    expect(screen.getByText("Dashboard")).toHaveClass("ui-page-title");
    expect(screen.getByText("Operational summary")).toHaveClass(
      "ui-page-subtitle",
    );
  });

  it("centers hero content when requested", () => {
    render(
      <SectionHeading
        size="hero"
        align="center"
        eyebrow="Overview"
        title="Unified experience"
      />,
    );

    expect(screen.getByText("Overview")).toHaveClass("ui-eyebrow");
    expect(screen.getByText("Unified experience")).toHaveClass("ui-hero-title");
  });
});
