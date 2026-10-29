import { describe, expect, it } from "vitest";
import { internalOperationalMetricsSchema } from "../src/admin/operational-metrics";

const legacyPayload = {
  window: {
    startInclusive: "2026-09-01T00:00:00.000Z",
    endExclusive: "2026-10-01T00:00:00.000Z",
    days: 30,
  },
  activity: {
    clinicsWithAppointments: 2,
    appointments: 6,
    completedAppointments: 4,
    invoices: 3,
    jobs: 4,
    failedJobs: 1,
  },
  telemetry: {
    samples: 6,
    serverErrors: 2,
    errorRatePercent: 100 / 3,
    p50Ms: 200,
    p95Ms: 470,
    firstSampleAt: "2026-09-01T00:00:00.000Z",
    lastSampleAt: "2026-09-30T00:00:00.000Z",
  },
};

describe("operational metrics additive contract", () => {
  it("accepts an older response without inventing new observations or scope", () => {
    expect(internalOperationalMetricsSchema.parse(legacyPayload)).toEqual(
      legacyPayload,
    );
  });

  it("preserves customer scope, sample validity and new activity observations", () => {
    const payload = {
      ...legacyPayload,
      definitionVersion: 2,
      activity: {
        ...legacyPayload.activity,
        prescriptionsCreated: 2,
        clinicPatientsSeen: 3,
      },
      telemetry: {
        ...legacyPayload.telemetry,
        requestScope: "CUSTOMER",
        p99Ms: 494,
        validLatencySamples: 3,
        invalidLatencySamples: 3,
      },
    };
    expect(internalOperationalMetricsSchema.parse(payload)).toEqual(payload);
  });

  it.each([
    { p99Ms: -1 },
    { validLatencySamples: -1 },
    { invalidLatencySamples: 1.5 },
    { requestScope: "HEALTH_CHECK" },
  ])("rejects malformed new telemetry fields", (fields) => {
    expect(() =>
      internalOperationalMetricsSchema.parse({
        ...legacyPayload,
        telemetry: { ...legacyPayload.telemetry, ...fields },
      }),
    ).toThrow();
  });

  it("rejects a negative distinct clinic-patient count", () => {
    expect(() =>
      internalOperationalMetricsSchema.parse({
        ...legacyPayload,
        activity: { ...legacyPayload.activity, clinicPatientsSeen: -1 },
      }),
    ).toThrow();
  });
});
