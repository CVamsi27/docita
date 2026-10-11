import { describe, expect, it } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import { SettingsPage } from "./settings-page";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("SettingsPage", () => {
  it("provides keyboard-accessible links to actual settings destinations", () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole("link", { name: /Account/ })).toHaveAttribute("href", "/settings/account");
    expect(screen.getByRole("link", { name: /Audit Log/ })).toHaveAttribute("href", "/settings/compliance#audit-log");
  });
  it("renders the page title", () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Manage clinic and account settings."),
    ).toBeInTheDocument();
  });

  it("renders all setting sections", () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp Sender")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp Templates")).toBeInTheDocument();
    expect(screen.getByText("Clinical Templates")).toBeInTheDocument();
    expect(screen.getByText("Doctor Profile")).toBeInTheDocument();
    expect(screen.getByText("Availability")).toBeInTheDocument();
    expect(screen.getByText("Leave")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
  });

  it("renders section descriptions", () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText("Manage staff, roles, and permissions")).toBeInTheDocument();
    expect(
      screen.getByText("Consent templates and regulatory settings"),
    ).toBeInTheDocument();
  });

  it("renders the join requests section", () => {
    renderWithProviders(<SettingsPage />);
    expect(
      screen.getByText("Review pending team join requests"),
    ).toBeInTheDocument();
  });
});
