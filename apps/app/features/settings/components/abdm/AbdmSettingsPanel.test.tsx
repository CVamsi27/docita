import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AbdmSettingsPanel } from "./AbdmSettingsPanel";

const updateClinicSettings = vi.fn();

const dashboard = {
  abdmEnabled: true,
  environmentConfigured: true,
  hfrFacilityId: "HFR-123",
  hfrConfigured: true,
  hprDoctorsConfigured: 4,
  doctorsRequiringHpr: 1,
  abhaVerifiedPatients: 180,
  totalPatients: 220,
  m1Status: "READY",
  m2Status: "PLANNED",
  m3Status: "PLANNED",
  readinessItems: [
    {
      key: "PLATFORM_CREDENTIALS",
      label: "Platform ABDM credentials",
      status: "READY",
      detail: "Sandbox or production ABDM credentials are configured.",
    },
    {
      key: "M2_CARE_CONTEXTS",
      label: "M2 care-context linking",
      status: "PLANNED",
      detail: "Care-context persistence is planned.",
    },
  ],
  dhisEstimate: {
    month: "2026-06",
    threshold: 100,
    totalPotentialRecords: 260,
    recordsAboveThreshold: 160,
    estimatedFacilityIncentivePaise: 130000,
    estimatedDscIncentivePaise: 65000,
    category1Count: 100,
    category2Count: 160,
    breakdown: [
      {
        key: "DIAGNOSTIC_REPORT",
        label: "Diagnostic Report",
        category: "CATEGORY_1",
        count: 70,
        facilityRatePaise: 1000,
        dscRatePaise: 500,
      },
      {
        key: "PRESCRIPTION",
        label: "Prescription",
        category: "CATEGORY_2",
        count: 80,
        facilityRatePaise: 500,
        dscRatePaise: 250,
      },
    ],
    ratesEffectiveLabel: "DHIS Corrigendum 7, April 2026 to September 2026",
    sourceLabel: "Potential records in Docita.",
  },
} as const;

vi.mock("@workspace/data-access", () => ({
  useClinicAbdmDashboard: () => ({
    data: dashboard,
    isLoading: false,
    error: null,
  }),
  useAbdmOpsInbox: () => ({
    data: {
      retryableTransactions: [
        {
          id: "tx-1",
          patientId: "patient-1",
          careContextId: "ctx-1",
          type: "M2_DATA_PUSH",
          direction: "OUTBOUND",
          status: "RETRYABLE",
          requestId: null,
          transactionId: null,
          correlationId: "DOCITA-PRESCRIPTION-rx-1",
          error: "ABDM gateway credentials not configured",
          retryCount: 0,
          nextRetryAt: null,
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
      ],
      failedTransactions: [],
      pendingConsents: [],
      recentExternalRecords: [],
    },
    isLoading: false,
    error: null,
  }),
  useUpdateClinicSettings: () => ({
    mutate: updateClinicSettings,
    isPending: false,
  }),
}));

describe("AbdmSettingsPanel", () => {
  beforeEach(() => {
    updateClinicSettings.mockClear();
  });

  it("renders readiness, planned M2 state, and DHIS estimates", () => {
    render(<AbdmSettingsPanel />);

    expect(screen.getByText("ABDM facility switch")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Enable ABDM for this facility" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("ABDM readiness")).toBeInTheDocument();
    expect(
      screen.getByText(
        "ABDM gateway credentials are configured. Sandbox and certification callbacks can be tested from this tenant.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("180/220")).toBeInTheDocument();
    expect(screen.getByText("M2 care-context linking")).toBeInTheDocument();
    expect(screen.getByText("ABDM ops inbox")).toBeInTheDocument();
    expect(screen.getByText("M2 DATA PUSH")).toBeInTheDocument();
    expect(screen.getByText("DHIS potential")).toBeInTheDocument();
    expect(screen.getByText("₹1,300")).toBeInTheDocument();
    expect(screen.getByText("Diagnostic Report")).toBeInTheDocument();
  });

  it("updates the facility ABDM switch", () => {
    render(<AbdmSettingsPanel />);

    fireEvent.click(
      screen.getByRole("switch", { name: "Enable ABDM for this facility" }),
    );

    expect(updateClinicSettings).toHaveBeenCalledWith(
      { abdmEnabled: false },
      expect.any(Object),
    );
  });
});
