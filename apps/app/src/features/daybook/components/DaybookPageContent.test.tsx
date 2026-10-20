import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { DaybookPageContent } from "./DaybookPageContent";

const fixture = vi.hoisted(() => ({
  canAccess: vi.fn(() => false),
  isError: false,
  refetch: vi.fn(),
  setSelectedDayIso: vi.fn(),
}));

vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => fixture,
}));
vi.mock("@/hooks/use-locale-currency", () => ({
  useLocaleCurrency: () => ({ currency: "INR" }),
}));
vi.mock("@/features/daybook/hooks/use-daybook", () => ({
  useDaybook: () => ({
    selectedDayIso: "2026-10-11",
    setSelectedDayIso: fixture.setSelectedDayIso,
    isToday: true,
    isLoading: false,
    isError: fixture.isError,
    refetch: fixture.refetch,
    summary: {
      collected: 500,
      pending: 0,
      cashOnHand: 500,
      invoiceCount: 1,
      paidCount: 1,
      byMethod: [],
      ledger: [
        {
          id: "invoice-fixture",
          invoiceNumber: "INV-fixture",
          patientName: "Fixture patient",
          amount: 500,
          methodLabel: "Cash",
          status: "PAID",
          at: "2026-10-11T10:00:00Z",
        },
      ],
    },
  }),
}));

describe("Daybook feature access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.canAccess.mockReturnValue(false);
    fixture.isError = false;
  });

  it.each([false, true])(
    "preserves the denied page heading without records or controls when isError=%s",
    (isError) => {
      fixture.isError = isError;
      render(<DaybookPageContent />);

      expect(
        screen.getByRole("heading", { name: "Daybook", level: 1 }),
      ).toBeVisible();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByRole("link", { name: /Upgrade to/ })).toHaveAttribute(
        "href",
        SUBSCRIPTION_SETTINGS_PATH,
      );
      expect(screen.queryByText("Fixture patient")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Refresh" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Previous day" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Next day" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Try again" }),
      ).not.toBeInTheDocument();
    },
  );

  it("preserves the allowed heading, ledger and refresh action", () => {
    fixture.canAccess.mockReturnValue(true);
    render(<DaybookPageContent />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Daybook", level: 1 }),
    ).toBeVisible();
    expect(screen.getByText("Fixture patient")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Upgrade to/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(fixture.refetch).toHaveBeenCalledOnce();
  });

  it("preserves the allowed error heading and retry action", () => {
    fixture.canAccess.mockReturnValue(true);
    fixture.isError = true;
    render(<DaybookPageContent />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Daybook", level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not load the daybook for this day",
    );
    expect(screen.queryByText("Fixture patient")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(fixture.refetch).toHaveBeenCalledOnce();
  });
});
