import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders title inside an h1 and description", () => {
    render(
      <PageHeader
        title="Patients"
        description="Manage your patient roster."
      />,
    );

    const heading = screen.getByRole("heading", { level: 1, name: /patients/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Manage your patient roster.")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <PageHeader
        title="Patients"
        actions={<button type="button">Add patient</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: /add patient/i }),
    ).toBeInTheDocument();
  });

  it("omits description when not provided", () => {
    render(<PageHeader title="Empty" />);
    expect(
      screen.getByRole("heading", { level: 1, name: /empty/i }),
    ).toBeInTheDocument();
  });

  it("applies splitRowClassName to the title/actions row", () => {
    const { container } = render(
      <PageHeader
        title="T"
        actions={<span data-testid="act">A</span>}
        splitRowClassName="md:items-center"
      />,
    );
    const row = container.querySelector(".md\\:flex-row");
    expect(row).toHaveClass("md:items-center");
  });
});
