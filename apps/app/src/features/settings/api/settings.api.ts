import {
  appAuditLogSummarySchema,
  appComplianceSummarySchema,
  appDataSubjectRequestSchema,
  type CreateDataSubjectRequest,
  type DataSubjectRequestStatus,
  type UpdateDataSubjectRequest,
} from "@workspace/types";
import { z } from "zod";

import { api } from "@/lib/api/api-client";

export const settingsApi = {
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", data),
};

/**
 * Compliance and DPDP patient-rights calls.
 *
 * Every endpoint here is `/clinics/:id/...`, and the server resolves that `:id`
 * by comparing it with `req.user.clinicId` (`assertOwnClinic`). This module
 * used to send the literal string `"current"` in place of the id, which matches
 * no clinic, so all four calls answered 403 for every user: the compliance
 * panel silently rendered empty. There is no `"current"` alias on the server and
 * no rewrite on the client, so the id has to come from the session.
 *
 * The generic `<T>()` pass-throughs are gone too. The caller used to choose the
 * response type — `getRecentAuditLogs<AppAuditLogSummary[]>()` asserted
 * whatever the caller wrote, and nothing checked the payload at runtime. These
 * now parse the shared contracts, which the compliance components were already
 * importing for their props.
 */
export const complianceApi = {
  getSummary: (clinicId: string) =>
    api.validate(
      `/clinics/${clinicId}/compliance`,
      appComplianceSummarySchema,
    ),

  getRecentAuditLogs: () =>
    api.validate("/audit/recent?limit=5", z.array(appAuditLogSummarySchema)),

  getDataSubjectRequests: (
    clinicId: string,
    status?: DataSubjectRequestStatus,
  ) =>
    api.validate(
      `/clinics/${clinicId}/data-subject-requests${
        status ? `?status=${status}` : ""
      }`,
      z.array(appDataSubjectRequestSchema),
    ),

  /**
   * `api.validate` takes a `BodyInit`, so it cannot carry the plain-object body
   * the other verbs serialize for us. The mutations therefore use `post` /
   * `patch` and parse the result here, rather than casting the body or
   * re-implementing serialization in the app.
   */
  createDataSubjectRequest: async (
    clinicId: string,
    data: CreateDataSubjectRequest,
  ) =>
    appDataSubjectRequestSchema.parse(
      await api.post(`/clinics/${clinicId}/data-subject-requests`, data),
    ),

  updateDataSubjectRequestStatus: async (
    clinicId: string,
    requestId: string,
    data: UpdateDataSubjectRequest,
  ) =>
    appDataSubjectRequestSchema.parse(
      await api.patch(
        `/clinics/${clinicId}/data-subject-requests/${requestId}`,
        data,
      ),
    ),
};