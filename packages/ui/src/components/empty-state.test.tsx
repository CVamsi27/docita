import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Inbox } from "lucide-react";

import { EmptyState, LoadingState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title, description, and icon", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nothing here"
        description="No items yet"
      />,
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No items yet")).toBeInTheDocument();
  });

  it("renders an anchor action when href is provided", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        action={{ label: "Create item", href: "/create" }}
      />,
    );

    const link = screen.getByRole("link", { name: /create item/i });
    expect(link).toHaveAttribute("href", "/create");
  });
});

describe("LoadingState", () => {
  it("renders a default loading message", () => {
    render(<LoadingState />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders a custom message", () => {
    render(<LoadingState message="Fetching patients..." />);
    expect(screen.getByText("Fetching patients...")).toBeInTheDocument();
  });
});
