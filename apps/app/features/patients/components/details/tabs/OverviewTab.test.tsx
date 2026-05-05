import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverviewTab } from "./OverviewTab";

vi.mock("@/features/patients/components/profile/PatientStatsCardsUI", () => ({
  PatientStatsCardsUI: () => <div data-testid="patient-stats-cards" />,
}));

describe("OverviewTab", () => {
  it("navigates to prescriptions via records sub-tab handler", () => {
    const onNavigateToRecordsSubTab = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <OverviewTab
        appointments={[]}
        statistics={null}
        onSelectTab={onSelectTab}
        onNavigateToRecordsSubTab={onNavigateToRecordsSubTab}
        onScheduleVisit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /View prescriptions/i }));
    expect(onNavigateToRecordsSubTab).toHaveBeenCalledWith("prescriptions");
    expect(onSelectTab).not.toHaveBeenCalledWith("prescriptions");
  });
});
