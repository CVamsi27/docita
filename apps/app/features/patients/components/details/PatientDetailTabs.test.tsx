import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LEGACY_PATIENT_TAB_REDIRECTS,
  PATIENT_DETAIL_TAB_VALUES,
  PATIENT_RECORDS_SUB_TABS,
  PatientDetailTabs,
} from "./PatientDetailTabs";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => "/patients/p-1",
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/features/patients/components/details/PatientTagManagerContainer", () => ({
  PatientTagManagerContainer: () => null,
}));

vi.mock("./PatientCommunicationTab", () => ({
  PatientCommunicationTab: () => (
    <div data-testid="patient-communication-tab" />
  ),
}));

vi.mock("@/features/patients/components/details/patient-detail-tab-loading-shell", () => ({
  PatientDetailTabLoadingShell: () => null,
}));

vi.mock("./patient-clinical-chart-summary", () => ({
  PatientClinicalChartSummary: () => (
    <div data-testid="patient-clinical-chart-summary" />
  ),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ canViewInvoices: true }),
}));

const baseProps = {
  patient: {
    id: "p-1",
    firstName: "Asha",
    lastName: "Rao",
  } as never,
  patientId: "p-1",
  appointments: [],
  canEditPatient: true,
  canRecordPatientVitals: true,
};

describe("PatientDetailTabs", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.router.push.mockReset();
    mocks.searchParams = new URLSearchParams();
  });

  it("ships with three top-level tabs after overview consolidation", () => {
    expect(PATIENT_DETAIL_TAB_VALUES).toEqual([
      "visits",
      "records",
      "billing",
    ]);
  });

  it("retired tabs map to records sub-tabs and overview redirects to visits", () => {
    expect(LEGACY_PATIENT_TAB_REDIRECTS).toEqual({
      overview: { tab: "visits" },
      vitals: { tab: "records", subtab: "vitals" },
      prescriptions: { tab: "records", subtab: "prescriptions" },
      labs: { tab: "records", subtab: "labs" },
      documents: { tab: "records", subtab: "documents" },
    });
    for (const subtab of PATIENT_RECORDS_SUB_TABS) {
      expect(typeof subtab).toBe("string");
    }
  });

  it("renders the top-level tab labels", () => {
    render(<PatientDetailTabs {...baseProps} />);

    expect(
      screen.getByTestId("patient-clinical-chart-summary"),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Visits" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Records" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Billing" })).toBeInTheDocument();
  });

  it("rewrites legacy ?tab=overview to visits", () => {
    mocks.searchParams = new URLSearchParams("tab=overview");
    render(<PatientDetailTabs {...baseProps} />);

    expect(mocks.router.replace).toHaveBeenCalledWith(
      "/patients/p-1?tab=visits",
      { scroll: false },
    );
  });

  it("rewrites legacy ?tab=vitals to records?subtab=vitals", () => {
    mocks.searchParams = new URLSearchParams("tab=vitals");
    render(<PatientDetailTabs {...baseProps} />);

    expect(mocks.router.replace).toHaveBeenCalledWith(
      "/patients/p-1?tab=records&subtab=vitals",
      { scroll: false },
    );
  });

  it("rewrites legacy ?tab=prescriptions to records?subtab=prescriptions", () => {
    mocks.searchParams = new URLSearchParams("tab=prescriptions");
    render(<PatientDetailTabs {...baseProps} />);

    expect(mocks.router.replace).toHaveBeenCalledWith(
      "/patients/p-1?tab=records&subtab=prescriptions",
      { scroll: false },
    );
  });

  it("renders the records sub-tab strip when records tab is active", () => {
    mocks.searchParams = new URLSearchParams("tab=records");
    render(<PatientDetailTabs {...baseProps} />);

    expect(screen.getByTestId("patient-records-subtabs")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "History & allergies" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Prescriptions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Vitals" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Labs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Documents" })).toBeInTheDocument();
  });

  // it("shows the communication tab content when active", () => {
  //   mocks.searchParams = new URLSearchParams("tab=communication");
  //   render(<PatientDetailTabs {...baseProps} />);

  //   expect(screen.getByTestId("patient-communication-tab")).toBeInTheDocument();
  // });
});
