import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    token: null,
    logout: vi.fn(),
  }),
}));

import SuperAdminDashboard from "./page";

describe("admin dashboard page", () => {
  it("renders the overview page", async () => {
    render(<SuperAdminDashboard />);

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });
});
