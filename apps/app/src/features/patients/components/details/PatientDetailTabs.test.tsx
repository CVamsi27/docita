import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { LEGACY_PATIENT_TAB_REDIRECTS, PATIENT_DETAIL_TAB_VALUES, PATIENT_RECORDS_SUB_TABS, PatientDetailTabs } from "./PatientDetailTabs";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useSearchParams: () => [mocks.searchParams, vi.fn()],
  };
});

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

// English literal map mirroring the Patients.tabs JSON keys the
// component uses, so test assertions on hardcoded English still match
// after the i18n refactor.
const patientTabsCopy: Record<string, string> = {
  sections: "Sections",
  patientDetailAria: "Patient detail",
  patientSectionsAria: "Patient sections",
  recordsSubSectionsAria: "Records sub-sections",
  summary: "Summary",
  visits: "Visits",
  records: "Records",
  billing: "Billing",
  messages: "Messages",
  history: "History & allergies",
  vitals: "Vitals",
  prescriptions: "Prescriptions",
  labs: "Labs",
  documents: "Documents",
  referrals: "Referrals",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => patientTabsCopy[key] ?? key,
    i18n: { language: "en" },
  }),
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

function renderTabs(initialEntries = ["/patients/p-1"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PatientDetailTabs {...baseProps} />
    </MemoryRouter>,
  );
}

describe("PatientDetailTabs", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.searchParams = new URLSearchParams();
  });

  it("ships with summary as the first top-level tab", () => {
    expect(PATIENT_DETAIL_TAB_VALUES).toEqual([
      "summary",
      "visits",
      "records",
      "billing",
      "communication",
    ]);
  });

  it("retired tabs map to records sub-tabs and overview redirects to summary", () => {
    expect(LEGACY_PATIENT_TAB_REDIRECTS).toEqual({
      overview: { tab: "summary" },
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
    renderTabs();

    expect(
      screen.getByTestId("patient-clinical-chart-summary"),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Visits" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Records" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Billing" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Messages" })).toBeInTheDocument();
  });

  it("rewrites legacy ?tab=overview to summary", () => {
    mocks.searchParams = new URLSearchParams("tab=overview");
    renderTabs(["/patients/p-1?tab=overview"]);

    expect(mocks.navigate).toHaveBeenCalledWith("?tab=summary", {
      replace: true,
    });
  });

  it("keeps visits explicit in the URL and summary implicit", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("tab", { name: "Visits" }));
    expect(mocks.navigate).toHaveBeenLastCalledWith("?tab=visits", {
      replace: true,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));
    expect(mocks.navigate).toHaveBeenLastCalledWith(".", {
      replace: true,
    });
  });

  it("rewrites legacy ?tab=vitals to records?subtab=vitals", () => {
    mocks.searchParams = new URLSearchParams("tab=vitals");
    renderTabs(["/patients/p-1?tab=vitals"]);

    expect(mocks.navigate).toHaveBeenCalledWith("?tab=records&subtab=vitals", {
      replace: true,
    });
  });

  it("rewrites legacy ?tab=prescriptions to records?subtab=prescriptions", () => {
    mocks.searchParams = new URLSearchParams("tab=prescriptions");
    renderTabs(["/patients/p-1?tab=prescriptions"]);

    expect(mocks.navigate).toHaveBeenCalledWith(
      "?tab=records&subtab=prescriptions",
      { replace: true },
    );
  });

  it("renders the records sub-tab strip when records tab is active", () => {
    mocks.searchParams = new URLSearchParams("tab=records");
    renderTabs(["/patients/p-1?tab=records"]);

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

  it("keeps trailing records sub-tabs reachable through URL state", () => {
    mocks.searchParams = new URLSearchParams("tab=records");
    renderTabs(["/patients/p-1?tab=records"]);

    fireEvent.click(screen.getByRole("tab", { name: "Documents" }));

    expect(mocks.navigate).toHaveBeenCalledWith(
      "?tab=records&subtab=documents",
      { replace: true },
    );
  });
});
