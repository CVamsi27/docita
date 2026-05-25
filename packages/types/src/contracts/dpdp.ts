import { z } from "zod";

/**
 * Versioned DPDP (Digital Personal Data Protection Act, 2023) consent notice.
 *
 * The version string is persisted on every Consent row (Consent.templateVersion)
 * so we can always recover the exact wording the data principal agreed to. Bump
 * the version any time the displayed text below changes — never edit in place.
 */
export const DPDP_NOTICE_VERSION = "dpdp-notice-v1-2026-05-11";

export const DPDP_NOTICE_TITLE = "Consent to process personal data (DPDP Act, 2023)";

/**
 * Patient-facing wording used on /book. Written in first person ("I consent").
 */
export const DPDP_NOTICE_TEXT_PATIENT = [
  "I consent to this clinic (the Data Fiduciary) collecting and processing my personal data and health information for the purposes of providing clinical care, scheduling and managing appointments, communicating about my care, billing, and maintaining my medical record.",
  "I understand the categories of data collected may include my name, contact details, date of birth, gender, address, medical and prescription history, payment information, and any other information I provide for my care.",
  "I understand my data will be retained only for as long as required by law or by legitimate medical record-keeping requirements, and that I have the right to access, correct, or request deletion of my data, and to withdraw this consent at any time by contacting the clinic. Withdrawal will not affect the lawfulness of processing carried out before the withdrawal.",
].join(" ");

/**
 * Staff-collected wording used in the Add Patient modal. Written from the
 * collecting staff member's perspective.
 */
export const DPDP_NOTICE_TEXT_STAFF = [
  "I confirm I have read out or shown the patient the clinic's DPDP notice and obtained their free, specific, informed and unambiguous consent to collect and process their personal data and health information for the purposes of clinical care, communication, scheduling, billing, and record-keeping, in accordance with the Digital Personal Data Protection Act, 2023.",
  "I confirm the patient (or their authorised representative for minors / dependants) has been informed of their right to access, correct, or request deletion of their data, and to withdraw consent at any time.",
].join(" ");

/**
 * Bulk-import wording shown to the operator. They attest, per upload, that
 * consent was already collected from each patient in the file (offline / on
 * paper). The attesting user, IP and time are persisted alongside each row's
 * Consent record.
 */
export const DPDP_NOTICE_TEXT_BULK_OPERATOR = [
  "I confirm that for every patient in this file, valid DPDP Act, 2023 consent has already been obtained — either in writing or verbally with a record on file — for collecting and processing their personal data and health information for clinical care, communication, scheduling, billing, and record-keeping at this clinic.",
  "I understand each patient created from this upload will be marked as having consented under the clinic's current DPDP notice and that this attestation is auditable.",
].join(" ");

export const dpdpConsentRelationSchema = z.enum([
  "SELF",
  "GUARDIAN",
  "SPOUSE",
  "PARENT",
  "OTHER",
]);

export type DpdpConsentRelation = z.infer<typeof dpdpConsentRelationSchema>;

/**
 * Payload included on every patient-create request (modal + /book) when
 * consent is collected at the point of capture. Backend converts this into
 * a Consent row with templateVersion = noticeVersion.
 */
export const dpdpConsentPayloadSchema = z
  .object({
    accepted: z.literal(true, {
      errorMap: () => ({ message: "DPDP consent is required to add a patient" }),
    }),
    noticeVersion: z.string().min(1).max(80),
    relation: dpdpConsentRelationSchema.optional(),
    /** Free-text name of the consenter (patient or guardian). Optional but recommended. */
    givenByName: z.string().trim().max(120).optional(),
  })
  .strict();

export type DpdpConsentPayload = z.infer<typeof dpdpConsentPayloadSchema>;

/**
 * Payload included on bulk patient uploads. The operator attests offline
 * consent was collected for every row. We record one Consent row per patient
 * created from the file with `givenBy = "BULK_IMPORT"` and notes referencing
 * the upload's job id.
 */
export const dpdpBulkAttestationSchema = z
  .object({
    confirmedByOperator: z.literal(true, {
      errorMap: () => ({
        message: "Confirm DPDP consent attestation before uploading",
      }),
    }),
    noticeVersion: z.string().min(1).max(80),
  })
  .strict();

export type DpdpBulkAttestation = z.infer<typeof dpdpBulkAttestationSchema>;
