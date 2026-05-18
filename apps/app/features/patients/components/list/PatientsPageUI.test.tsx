import { fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi } from "vitest";
import type { Patient } from "@workspace/types";
import { PatientsPageUI } from "./PatientsPageUI";

const noop = () => {};

const baseHandlers = {
  onSearchChange: noop,
  onClearSearch: noop,
  onSort: noop,
  onViewPatient: noop,
  onSchedulePatient: noop,
  onEditPatient: noop,
  onAddPatient: noop,
  onPrevPage: noop,
  onNextPage: noop,
  onRetry: noop,
};

const mockPatient: Patient = {
  id: "patient-1",
  firstName: "Ada",
  lastName: "Lovelace",
  gender: "FEMALE",
  isolationStatus: "NONE",
  fallRisk: false,
  phoneNumber: "9000000001",
  email: "ada@example.com",
};

describe("PatientsPageUI", () => {
  it("renders the page-level empty state when no patients exist", () => {
    render(
      <PatientsPageUI
        {...baseHandlers}
        isLoading={false}
        error={null}
        searchQuery=""
        sortConfig={null}
        filteredPatients={[]}
        totalPatients={0}
        pageSize={25}
        currentPage={1}
        canGoPrev={false}
        canGoNext={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Patients" })).toBeVisible();
    expect(screen.getByText(/no patients yet/i)).toBeVisible();
  });

  it("shows the API error message and retry control when error is set", () => {
    const onRetry = vi.fn();
    render(
      <PatientsPageUI
        {...baseHandlers}
        onRetry={onRetry}
        isLoading={false}
        error="We could not load patients. Please try again."
        searchQuery=""
        sortConfig={null}
        filteredPatients={[]}
        totalPatients={0}
        pageSize={25}
        currentPage={1}
        canGoPrev={false}
        canGoNext={false}
      />,
    );

    expect(
      screen.getByText(/we could not load patients/i),
    ).toBeVisible();
    const retry = screen.getByRole("button", { name: /try again|retry/i });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows consultation queue shortcut when handler is provided", () => {
    const onOpenConsultationQueue = vi.fn();

    render(
      <PatientsPageUI
        {...baseHandlers}
        onOpenConsultationQueue={onOpenConsultationQueue}
        isLoading={false}
        error={null}
        searchQuery=""
        sortConfig={null}
        filteredPatients={[mockPatient]}
        totalPatients={1}
        pageSize={25}
        currentPage={1}
        canGoPrev={false}
        canGoNext={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Queue/i }));
    expect(onOpenConsultationQueue).toHaveBeenCalledTimes(1);
  });

  it("calls onViewPatient when a row is clicked", () => {
    const onViewPatient = vi.fn();

    render(
      <PatientsPageUI
        {...baseHandlers}
        onViewPatient={onViewPatient}
        isLoading={false}
        error={null}
        searchQuery=""
        sortConfig={null}
        filteredPatients={[mockPatient]}
        totalPatients={1}
        pageSize={25}
        currentPage={1}
        canGoPrev={false}
        canGoNext={false}
      />,
    );

    fireEvent.click(screen.getByText("Ada Lovelace"));
    expect(onViewPatient).toHaveBeenCalledWith("patient-1");
  });
});
