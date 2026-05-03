import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { YearlyVsListAnnualPrice } from "./yearly-vs-list-annual-price";

describe("YearlyVsListAnnualPrice", () => {
  it("shows struck-through list annual and discounted price when annual is cheaper", () => {
    render(
      <YearlyVsListAnnualPrice
        monthlyListPrice={499}
        discountedAnnualPrice={4990}
        formatMoney={(n) => `₹${n.toLocaleString("en-IN")}`}
      />,
    );

    expect(screen.getByText("₹5,988")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("₹4,990/yr")).toBeInTheDocument();
  });

  it("shows a single price when list annual is not above discounted", () => {
    const { container } = render(
      <YearlyVsListAnnualPrice
        monthlyListPrice={100}
        discountedAnnualPrice={1200}
        formatMoney={(n) => `$${n}`}
      />,
    );

    expect(container.textContent).toContain("$1200/yr");
    expect(container.querySelector(".line-through")).toBeNull();
  });
});
