import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys-clinician-all";

describe("queryKeys (clinician)", () => {
  describe("patients", () => {
    it("exposes a stable root and list-collection keys", () => {
      expect(queryKeys.patients.all()).toEqual(["patients"]);
      expect(queryKeys.patients.lists()).toEqual(["patients", "list"]);
    });

    it("keys filtered lists with the params object and defaults to {} when omitted", () => {
      expect(queryKeys.patients.list({ search: "ram" })).toEqual([
        "patients",
        "list",
        { search: "ram" },
      ]);
      expect(queryKeys.patients.list()).toEqual(["patients", "list", {}]);
    });

    it("keys infinite queries with an empty-string slot when search is omitted", () => {
      expect(queryKeys.patients.infinite()).toEqual(["patients", "infinite", ""]);
      expect(queryKeys.patients.infinite("ram")).toEqual([
        "patients",
        "infinite",
        "ram",
      ]);
    });

    it("normalizes the recent limit to a string", () => {
      expect(queryKeys.patients.recent(5)).toEqual(["patients", "recent", "5"]);
    });

    it("keys today's list under the doctor id with an empty default search", () => {
      expect(queryKeys.patients.todays("doc_1")).toEqual([
        "todays-patients",
        "doc_1",
        "",
      ]);
      expect(queryKeys.patients.todays("doc_1", "search")).toEqual([
        "todays-patients",
        "doc_1",
        "search",
      ]);
    });

    it("nests metrics keys under the patient detail key", () => {
      expect(queryKeys.patients.metrics.root("p_1")).toEqual([
        "patients",
        "detail",
        "p_1",
        "metrics",
      ]);
      expect(
        queryKeys.patients.metrics.history("p_1", { from: "2026-01-01" }),
      ).toEqual([
        "patients",
        "detail",
        "p_1",
        "metrics",
        "history",
        { from: "2026-01-01" },
      ]);
      expect(queryKeys.patients.metrics.history("p_1")).toEqual([
        "patients",
        "detail",
        "p_1",
        "metrics",
        "history",
        {},
      ]);
    });
  });

  describe("appointments", () => {
    it("keys patient-scoped lists under a stable object", () => {
      expect(queryKeys.appointments.byPatient("p_1")).toEqual([
        "appointments",
        "list",
        { patientId: "p_1" },
      ]);
    });

    it("applies withParams to list and infinite queries", () => {
      expect(queryKeys.appointments.list({ date: "2026-08-01" })).toEqual([
        "appointments",
        "list",
        { date: "2026-08-01" },
      ]);
      expect(queryKeys.appointments.infinite()).toEqual([
        "appointments",
        "infinite",
        {},
      ]);
    });
  });

  describe("desk", () => {
    it("keys open invoices with an empty slot for the all-patients query", () => {
      expect(queryKeys.desk.openInvoices()).toEqual(["desk", "open-invoices", ""]);
      expect(queryKeys.desk.openInvoices("p_1")).toEqual([
        "desk",
        "open-invoices",
        "p_1",
      ]);
    });
  });

  describe("clinic", () => {
    it("passes undefined/null clinic ids through the subscription slot", () => {
      expect(queryKeys.clinic.subscription()).toEqual([
        "clinic-subscription",
        undefined,
      ]);
      expect(queryKeys.clinic.subscription(null)).toEqual([
        "clinic-subscription",
        null,
      ]);
      expect(queryKeys.clinic.subscription("cl_1")).toEqual([
        "clinic-subscription",
        "cl_1",
      ]);
    });
  });

  describe("abdm", () => {
    it("uses an empty string for missing patient scopes", () => {
      expect(queryKeys.abdm.careContexts()).toEqual(["abdm", "care-contexts", ""]);
      expect(queryKeys.abdm.externalRecords("p_1")).toEqual([
        "abdm",
        "external-records",
        "p_1",
      ]);
    });
  });

  describe("analytics", () => {
    it("fills default date ranges with empty strings", () => {
      expect(queryKeys.analytics.diseaseTrends("cl_1")).toEqual([
        "analytics",
        "disease-trends",
        "cl_1",
        "",
        "",
      ]);
    });

    it("keys period-scoped metrics with the period verbatim", () => {
      expect(
        queryKeys.analytics.revenueMetrics(
          "cl_1",
          "monthly",
          "2026-01-01",
          "2026-01-31",
        ),
      ).toEqual([
        "revenue-metrics",
        "cl_1",
        "monthly",
        "2026-01-01",
        "2026-01-31",
      ]);
    });
  });

  describe("publicBooking", () => {
    it("keys context with the verification-token slot (null-safe)", () => {
      expect(queryKeys.publicBooking.context("rc_1", null)).toEqual([
        "public-booking",
        "context",
        "rc_1",
        null,
      ]);
      expect(queryKeys.publicBooking.context("rc_1", "tok")).toEqual([
        "public-booking",
        "context",
        "rc_1",
        "tok",
      ]);
    });
  });

  describe("medications", () => {
    it("defaults the prescription-id slot for adherence", () => {
      expect(queryKeys.medications.adherence("p_1")).toEqual([
        "medication-adherence",
        "p_1",
        "",
      ]);
      expect(queryKeys.medications.adherencePrefix("p_1")).toEqual([
        "medication-adherence",
        "p_1",
      ]);
    });
  });

  describe("doctorTimeOffs", () => {
    it("scopes the list by doctor and scope", () => {
      expect(queryKeys.doctorTimeOffs.list("doc_1", "upcoming")).toEqual([
        "doctor-time-offs",
        "doc_1",
        "upcoming",
      ]);
    });
  });

  describe("prescriptions / invoices", () => {
    it("applies withParams for filtered lists and keeps detail keys granular", () => {
      expect(queryKeys.prescriptions.list()).toEqual(["prescriptions", {}]);
      expect(queryKeys.prescriptions.list({ status: "ACTIVE" })).toEqual([
        "prescriptions",
        { status: "ACTIVE" },
      ]);
      expect(queryKeys.invoices.legacyList()).toEqual(["invoices", {}]);
      expect(queryKeys.invoices.paymentActivity("inv_1")).toEqual([
        "invoices",
        "inv_1",
        "payment-activity",
      ]);
      expect(queryKeys.invoices.collectionsByMode("2026-01-01", "2026-01-31")).toEqual([
        "invoices",
        "reports",
        "collections-by-mode",
        "2026-01-01",
        "2026-01-31",
      ]);
    });
  });

  describe("patientPortal", () => {
    it("keys nested appointments, prescriptions, and metrics under the portal prefix", () => {
      expect(queryKeys.patientPortal.appointments.all()).toEqual([
        "patient-portal",
        "appointments",
      ]);
      expect(queryKeys.patientPortal.appointments.detail("apt_1")).toEqual([
        "patient-portal",
        "appointments",
        "apt_1",
      ]);
      expect(queryKeys.patientPortal.metrics.historyPrefix()).toEqual([
        "patient-portal",
        "metrics",
        "history",
      ]);
      expect(
        queryKeys.patientPortal.metrics.vitalsHistory({ patientId: "p_1" }),
      ).toEqual([
        "patient-portal",
        "metrics",
        "vitals-history",
        { patientId: "p_1" },
      ]);
    });
  });

  describe("clinical", () => {
    it("keeps lab-test orders and queue on distinct prefixes", () => {
      expect(queryKeys.clinical.labTests.ordersList()).toEqual([
        "lab-test-orders",
        {},
      ]);
      expect(queryKeys.clinical.labTests.queueInvalidation()).toEqual([
        "lab-queue",
      ]);
    });
  });
});
