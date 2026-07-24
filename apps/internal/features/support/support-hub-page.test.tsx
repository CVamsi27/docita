import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataAccessProvider } from "@workspace/data-access";

vi.mock("./support-inbox-page", () => ({
  SupportInboxPage: () => <div>WhatsApp inbox panel</div>,
}));

vi.mock("./support-inquiries-section", () => ({
  SupportInquiriesSection: () => <div>Contact inquiries panel</div>,
}));

// English literal map mirroring the SupportHub JSON keys the
// component uses, so test assertions on hardcoded English still match
// after the i18n refactor.
const supportHubCopy: Record<string, string> = {
  pageTitle: "Support",
  pageDescription: "WhatsApp conversations and contact form inquiries from the public site.",
  tabWhatsapp: "WhatsApp",
  tabInquiries: "Contact form",
  tabAria: "Support channels",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => supportHubCopy[key] ?? key,
}));

import { SupportHubPage } from "./support-hub-page";

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DataAccessProvider
        config={{
          fetcher: () => Promise.resolve(null as never),
          getClinicId: () => undefined,
          getClinicTimezone: () => undefined,
          isTierFeatureEnabled: () => true,
        }}
      >
        {ui}
      </DataAccessProvider>
    </QueryClientProvider>,
  );
}

describe("SupportHubPage", () => {
  it("shows WhatsApp by default and switches to contact inquiries", () => {
    renderWithProviders(<SupportHubPage />);

    expect(screen.getByRole("heading", { name: "Support" })).toBeInTheDocument();
    expect(screen.getByText("WhatsApp inbox panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Contact form" }));

    expect(screen.getByText("Contact inquiries panel")).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp inbox panel")).not.toBeInTheDocument();
  });
});
