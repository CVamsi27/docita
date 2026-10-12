import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  validate: vi.fn(),
}));

vi.mock("@/lib/api/api-client", () => ({ api: apiMock }));

import { complianceApi } from "./settings.api";

const COMPLIANCE_PAYLOAD = {
  slaSignatureUrl: null,
  slaSignatureAcceptedAt: null,
  consentTemplateEnabled: false,
  consentTemplateUpdatedAt: null,
  withdrawalRequestsOpen: 0,
  dataExportRequestsOpen: 0,
  dataDeletionRequestsOpen: 0,
};

const DSR_ROW = {
  id: "dsr-1",
  clinicId: "clinic-1",
  patientId: null,
  requestType: "EXPORT",
  status: "OPEN",
  requestedByName: null,
  requestedByRelation: null,
  requestChannel: null,
  requestDetails: null,
  dueAt: null,
  completedAt: null,
  handledById: null,
  handledAt: null,
  resolutionNotes: null,
  createdAt: "2026-07-04T08:00:00.000Z",
  updatedAt: "2026-07-04T08:00:00.000Z",
};

const AUDIT_ROW = {
  id: "log-1",
  action: "PATIENT_UPDATED",
  createdAt: "2026-07-04T08:00:00.000Z",
  actor: { name: "Asha Rao" },
};

/** The schema the app handed to `api.validate` for the most recent call. */
function lastValidateSchema(): z.ZodType<unknown> {
  const call = apiMock.validate.mock.calls.at(-1);
  if (!call) throw new Error("api.validate was not called");
  return call[1] as z.ZodType<unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.validate.mockResolvedValue(undefined);
});

/**
 * The compliance panel used to send the literal `"current"` as the clinic id:
 *
 *   getSummary: <T>() => api.get<T>(`/clinics/current/compliance`)
 *
 * The server resolves `:id` by comparing it with `req.user.clinicId`, so that
 * matched no clinic and every compliance request answered 403 — the panel
 * rendered permanently empty and said nothing to the clinician. These
 * assertions pin the path to whatever clinic id the caller passes.
 */
describe("complianceApi clinic scoping", () => {
  it("scopes the summary to the clinic id it is given", async () => {
    await complianceApi.getSummary("clinic-7");

    expect(apiMock.validate.mock.calls[0][0]).toBe(
      "/clinics/clinic-7/compliance",
    );
  });

  it("scopes the data-subject list to the clinic id it is given", async () => {
    await complianceApi.getDataSubjectRequests("clinic-7");

    expect(apiMock.validate.mock.calls[0][0]).toBe(
      "/clinics/clinic-7/data-subject-requests",
    );
  });

  it("passes an explicit status filter through as a query parameter", async () => {
    await complianceApi.getDataSubjectRequests("clinic-7", "IN_REVIEW");

    expect(apiMock.validate.mock.calls[0][0]).toBe(
      "/clinics/clinic-7/data-subject-requests?status=IN_REVIEW",
    );
  });

  it("never sends an unscoped status filter as a placeholder", async () => {
    await complianceApi.getDataSubjectRequests("clinic-7");

    expect(apiMock.validate.mock.calls[0][0]).not.toContain("status=");
  });

  it("creates a data-subject request under the same clinic id", async () => {
    apiMock.post.mockResolvedValueOnce(DSR_ROW);

    await complianceApi.createDataSubjectRequest("clinic-7", {
      requestType: "EXPORT",
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/clinics/clinic-7/data-subject-requests",
      { requestType: "EXPORT" },
    );
  });

  it("updates a data-subject request under the same clinic id", async () => {
    apiMock.patch.mockResolvedValueOnce({ ...DSR_ROW, status: "FULFILLED" });

    await complianceApi.updateDataSubjectRequestStatus(
      "clinic-7",
      "dsr-1",
      { status: "FULFILLED" },
    );

    expect(apiMock.patch).toHaveBeenCalledWith(
      "/clinics/clinic-7/data-subject-requests/dsr-1",
      { status: "FULFILLED" },
    );
  });

  it("builds no path from a placeholder clinic segment", async () => {
    await complianceApi.getSummary("clinic-7");
    await complianceApi.getDataSubjectRequests("clinic-7");

    for (const call of apiMock.validate.mock.calls) {
      expect(String(call[0])).not.toContain("/clinics/current");
    }
  });
});

/**
 * The `<T>()` pass-throughs this replaced asserted whatever the caller wrote —
 * `getRecentAuditLogs<AppAuditLogSummary[]>()` typechecked the caller's guess
 * and validated nothing. Each call now hands the shared contract to the client,
 * so these assert the schema that will actually run.
 */
describe("complianceApi response contracts", () => {
  it("validates the compliance summary against the shared schema", async () => {
    await complianceApi.getSummary("clinic-7");
    const schema = lastValidateSchema();

    expect(schema.safeParse(COMPLIANCE_PAYLOAD).success).toBe(true);
    expect(
      schema.safeParse({ ...COMPLIANCE_PAYLOAD, slaSignatureUrl: undefined })
        .success,
    ).toBe(false);
  });

  it("validates recent audit logs as an array of the shared row", async () => {
    await complianceApi.getRecentAuditLogs();
    const schema = lastValidateSchema();

    expect(apiMock.validate.mock.calls[0][0]).toBe("/audit/recent?limit=5");
    expect(schema.safeParse([AUDIT_ROW]).success).toBe(true);
    expect(schema.safeParse({ ...AUDIT_ROW, action: undefined }).success).toBe(
      false,
    );
  });

  it("validates the data-subject list as an array of the shared row", async () => {
    await complianceApi.getDataSubjectRequests("clinic-7");
    const schema = lastValidateSchema();

    expect(schema.safeParse([DSR_ROW]).success).toBe(true);
    expect(schema.safeParse([DSR_ROW, { ...DSR_ROW }]).success).toBe(true);
    expect(
      schema.safeParse([{ ...DSR_ROW, status: "ARCHIVED" }]).success,
    ).toBe(false);
  });

  it("rejects a created data-subject request the server drifted on", async () => {
    apiMock.post.mockResolvedValueOnce({ ...DSR_ROW, status: "ARCHIVED" });

    await expect(
      complianceApi.createDataSubjectRequest("clinic-7", {
        requestType: "EXPORT",
      }),
    ).rejects.toThrow();
  });

  it("rejects an updated data-subject request missing a required key", async () => {
    apiMock.patch.mockResolvedValueOnce({ ...DSR_ROW, createdAt: undefined });

    await expect(
      complianceApi.updateDataSubjectRequestStatus("clinic-7", "dsr-1", {
        status: "FULFILLED",
      }),
    ).rejects.toThrow();
  });

  it("returns the parsed row, not the raw payload", async () => {
    apiMock.patch.mockResolvedValueOnce({
      ...DSR_ROW,
      status: "FULFILLED",
      internalNote: "should not survive the parse",
    });

    const updated = await complianceApi.updateDataSubjectRequestStatus(
      "clinic-7",
      "dsr-1",
      { status: "FULFILLED" },
    );

    expect(updated).toEqual({ ...DSR_ROW, status: "FULFILLED" });
    expect(updated).not.toHaveProperty("internalNote");
  });
});