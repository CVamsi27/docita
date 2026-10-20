import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useInvoice, useDataAccessContext } from "@workspace/data-access";
import { Feature, Tier } from "@workspace/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAPI } from "@/lib/api/api-core";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { DataAccessBridge } from "./data-access-bridge";

vi.mock("@/lib/api/api-core", () => ({ fetchAPI: vi.fn() }));
vi.mock("@/lib/auth/auth-context", () => ({ useOptionalAuth: () => null }));
vi.mock("@/lib/contexts/clinic-context", () => ({
  useOptionalClinic: () => null,
}));

function InvoiceProbe() {
  const invoice = useInvoice("synthetic-invoice");
  const context = useDataAccessContext();
  return (
    <>
      <p>{invoice.isError ? "Read attempted" : "Waiting for access"}</p>
      <p>
        {context.isTierFeatureEnabled(Feature.INVOICING)
          ? "Invoice access enabled"
          : "Invoice access disabled"}
      </p>
      <p>
        {context.isTierFeatureEnabled(Feature.INSURANCE_BILLING)
          ? "Claim access enabled"
          : "Claim access disabled"}
      </p>
    </>
  );
}

describe("data-access permission refresh", () => {
  afterEach(() => {
    usePermissionStore.setState(usePermissionStore.getInitialState());
    vi.mocked(fetchAPI).mockReset();
  });

  it("starts an enabled record query when clinic permissions arrive", async () => {
    usePermissionStore.setState({
      currentTier: Tier.STARTER,
      currentMode: "FULL",
      userRole: "ADMIN_DOCTOR",
      clinicType: "GENERAL",
      featureOverrides: {},
    });
    vi.mocked(fetchAPI).mockRejectedValue(new Error("Synthetic read response"));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <DataAccessBridge>
          <InvoiceProbe />
        </DataAccessBridge>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Waiting for access")).toBeInTheDocument();
    expect(fetchAPI).not.toHaveBeenCalled();
    act(() =>
      usePermissionStore.setState({
        currentTier: Tier.ENTERPRISE,
        currentMode: "FULL",
      }),
    );
    await waitFor(() => expect(fetchAPI).toHaveBeenCalled());
    expect(await screen.findByText("Read attempted")).toBeInTheDocument();
    expect(screen.getByText("Invoice access enabled")).toBeInTheDocument();
    expect(screen.getByText("Claim access disabled")).toBeInTheDocument();
    act(() => usePermissionStore.getState().setTier(Tier.STARTER));
    expect(screen.getByText("Invoice access disabled")).toBeInTheDocument();
    expect(fetchAPI).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
