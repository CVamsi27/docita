import { useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Feature } from "@workspace/types";
import { fireEvent, render, screen } from "@/test-utils";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { InvoicesPageUI } from "./InvoicesPageUI";

const permissions = vi.hoisted(() => ({ canAccess: vi.fn(() => false) }));

vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => permissions,
}));

vi.mock("@/hooks/use-locale-currency", () => ({
  useLocaleCurrency: () => ({ currency: "INR" }),
}));

vi.mock("@/features/invoices/hooks/use-invoices-logic", () => ({
  useInvoicesLogic: () => ({
    invoices: [],
    filteredInvoices: [],
    loading: false,
    isError: false,
    error: null,
    filter: "all",
    setFilter: vi.fn(),
    sortConfig: null,
    handleSort: vi.fn(),
    handleDownloadPdf: vi.fn(),
    handleRefresh: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    refetch: vi.fn(),
  }),
}));

function CurrentLocation() {
  const location = useLocation();
  return (
    <output aria-label="Current location">
      {location.pathname + location.search}
    </output>
  );
}

describe("InvoicesPageUI access states", () => {
  beforeEach(() => {
    permissions.canAccess.mockReset();
    permissions.canAccess.mockReturnValue(false);
  });

  it("gives the denied page a heading and upgrade path without invoice actions", () => {
    render(
      <>
        <InvoicesPageUI />
        <CurrentLocation />
      </>,
      { initialEntries: ["/invoices"] },
    );

    expect(permissions.canAccess).toHaveBeenCalledWith(Feature.INVOICING);
    expect(
      screen.getByRole("heading", { level: 1, name: "Invoices" }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText("View and manage invoices for your clinic."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create Invoice" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search invoices")).not.toBeInTheDocument();
    expect(screen.queryByText("No invoices found")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade plan" }));
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      SUBSCRIPTION_SETTINGS_PATH,
    );
  });

  it("keeps one heading and the invoice controls when access is enabled", () => {
    permissions.canAccess.mockReturnValue(true);
    render(<InvoicesPageUI />);

    expect(permissions.canAccess).toHaveBeenCalledWith(Feature.INVOICING);
    expect(
      screen.getByRole("heading", { level: 1, name: "Invoices" }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Create Invoice" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
    expect(screen.getByLabelText("Search invoices")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Upgrade plan" }),
    ).not.toBeInTheDocument();
  });
});
