import { describe, expect, it } from "vitest";
import {
  abhaAddressSchema,
  abhaNumberSchema,
  abdmCareContextSchema,
  abdmClinicDashboardSchema,
  abdmGatewayCallbackSchema,
  abdmOpsInboxSchema,
  abhaVerificationResultSchema,
  createAbdmCareContextRequestSchema,
  createAbdmConsentRequestSchema,
  verifyAbhaRequestSchema,
} from "../src/clinical/abdm";

describe("abhaAddressSchema", () => {
  it("accepts a valid ABHA address and lowercases it", () => {
    expect(abhaAddressSchema.parse("Asha.Verma@abdm")).toBe("asha.verma@abdm");
  });

  it("accepts sandbox and digit-bearing handles", () => {
    expect(abhaAddressSchema.parse("ravi_kumar1@sbx")).toBe("ravi_kumar1@sbx");
  });

  it.each([
    ["no @ suffix", "ashaverma"],
    ["too short local part", "ab@abdm"],
    ["leading separator", "_asha@abdm"],
    ["starts with digit", "1asha@abdm"],
    ["double separator", "asha..verma@abdm"],
    ["uppercase suffix rejected as non-letter", "asha@ABDM1"],
  ])("rejects %s", (_label, value) => {
    expect(abhaAddressSchema.safeParse(value).success).toBe(false);
  });
});

describe("abhaNumberSchema", () => {
  it("accepts a 14-digit number with hyphens and strips them", () => {
    expect(abhaNumberSchema.parse("12-3456-7890-1234")).toBe("12345678901234");
  });

  it("rejects non-14-digit numbers", () => {
    expect(abhaNumberSchema.safeParse("12345").success).toBe(false);
    expect(abhaNumberSchema.safeParse("abcd56789012345").success).toBe(false);
  });
});

describe("verifyAbhaRequestSchema", () => {
  it("requires either an ABHA address or ABHA number", () => {
    expect(verifyAbhaRequestSchema.safeParse({}).success).toBe(false);
    expect(
      verifyAbhaRequestSchema.parse({ abhaNumber: "12-3456-7890-1234" }),
    ).toEqual({ abhaNumber: "12345678901234" });
  });
});

describe("abhaVerificationResultSchema", () => {
  it("accepts success and not-configured result states", () => {
    expect(
      abhaVerificationResultSchema.parse({
        verified: true,
        abhaAddress: "asha.verma@abdm",
        abhaNumber: "12345678901234",
        kycName: "Asha Verma",
        verifiedAt: "2026-06-11T00:00:00.000Z",
        error: null,
      }).verified,
    ).toBe(true);

    expect(
      abhaVerificationResultSchema.parse({
        verified: false,
        abhaAddress: null,
        abhaNumber: null,
        kycName: null,
        verifiedAt: null,
        error: "ABDM_NOT_CONFIGURED",
      }).error,
    ).toBe("ABDM_NOT_CONFIGURED");
  });
});

describe("ABDM M2/M3 schemas", () => {
  it("accepts the clinic dashboard contract with tenant enablement state", () => {
    const dashboard = abdmClinicDashboardSchema.parse({
      abdmEnabled: false,
      environmentConfigured: false,
      hfrFacilityId: null,
      hfrConfigured: false,
      hprDoctorsConfigured: 0,
      doctorsRequiringHpr: 1,
      abhaVerifiedPatients: 0,
      totalPatients: 10,
      m1Status: "PENDING",
      m2Status: "PLANNED",
      m3Status: "PLANNED",
      readinessItems: [
        {
          key: "TENANT_ENABLEMENT",
          label: "Facility ABDM switch",
          status: "BLOCKED",
          detail: "ABDM is off.",
        },
      ],
      dhisEstimate: {
        month: "2026-06",
        threshold: 100,
        totalPotentialRecords: 0,
        recordsAboveThreshold: 0,
        estimatedFacilityIncentivePaise: 0,
        estimatedDscIncentivePaise: 0,
        category1Count: 0,
        category2Count: 0,
        breakdown: [],
        ratesEffectiveLabel: "DHIS estimate",
        sourceLabel: "Potential records",
      },
    });

    expect(dashboard.abdmEnabled).toBe(false);
  });

  it("accepts care-context, callback, consent, and ops inbox contracts", () => {
    const careContext = abdmCareContextSchema.parse({
      id: "ctx-1",
      patientId: "patient-1",
      sourceType: "PRESCRIPTION",
      sourceId: "rx-1",
      referenceNumber: "DOCITA-PRESCRIPTION-rx-1",
      display: "Prescription 2026-06-12",
      hiType: "Prescription",
      status: "READY",
      linkedAt: null,
      lastSharedAt: null,
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    });

    expect(
      createAbdmCareContextRequestSchema.parse({
        patientId: "patient-1",
        sourceType: "PRESCRIPTION",
        sourceId: "rx-1",
      }),
    ).toEqual({
      patientId: "patient-1",
      sourceType: "PRESCRIPTION",
      sourceId: "rx-1",
    });

    expect(
      createAbdmConsentRequestSchema.parse({
        patientId: "patient-1",
        abhaAddress: "asha.verma@abdm",
      }).purposeCode,
    ).toBe("CAREMGT");

    expect(
      abdmGatewayCallbackSchema.parse({
        requestId: "request-1",
        transactionId: "transaction-1",
        patientId: "patient-1",
        hiType: "Prescription",
        payload: { resourceType: "Bundle" },
      }).hiType,
    ).toBe("Prescription");

    expect(
      abdmOpsInboxSchema.parse({
        retryableTransactions: [],
        failedTransactions: [],
        pendingConsents: [],
        recentExternalRecords: [],
      }),
    ).toEqual({
      retryableTransactions: [],
      failedTransactions: [],
      pendingConsents: [],
      recentExternalRecords: [],
    });
    expect(careContext.referenceNumber).toBe("DOCITA-PRESCRIPTION-rx-1");
  });
});
