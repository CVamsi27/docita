"use client";

import { getUserFacingErrorMessage, parseStringEnumMember } from "@workspace/utils";
import {
  HOSPITAL_ROLE_LABELS,
  type HospitalRole,
  hospitalRoleSchema,
  type Specialization,
  SPECIALIZATION_LABELS,
  specializationSchema,
} from "@workspace/types";

export interface Doctor {
  id: string;
  name: string;
  email: string;
  clinicId?: string;
  specialization?: Specialization;
  hospitalRole?: HospitalRole;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  phoneNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  profilePhotoUrl?: string;
  signatureUrl?: string;
  signatureUploadedAt?: string;
  verificationStatus?:
    | "UNVERIFIED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "FAILED";
  verificationReason?: string;
  verificationCheckedAt?: string;
  verificationSource?: string;
  registrationCouncil?: string;
  registrationStateCode?: string;
  registrationCertificateUrl?: string | null;
  verifiedByAdminId?: string | null;
  verifiedByAdminAt?: string | null;
  createdAt: string;
  educationHistory?: Education[];
  certifications?: Certification[];
  additionalSpecializations?: DoctorSpecializationEntry[];
}

interface Education {
  id: string;
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  location?: string;
  startYear?: number;
  endYear?: number;
  isOngoing: boolean;
  grade?: string;
}

interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
}

interface DoctorSpecializationEntry {
  id: string;
  specialization: Specialization;
  isPrimary: boolean;
  yearsOfPractice?: number;
}

export const EMPTY_CLINICS: { id: string; name: string }[] = [];

const DOCTOR_VERIFICATION_STATUS_VALUES = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "FAILED",
] as const satisfies readonly NonNullable<Doctor["verificationStatus"]>[];

export function parseDoctorVerificationStatus(
  value: string | undefined,
): Doctor["verificationStatus"] | undefined {
  if (!value) return undefined;
  return parseStringEnumMember(DOCTOR_VERIFICATION_STATUS_VALUES, value) ?? undefined;
}

export function labelForSpecialization(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = parseStringEnumMember(specializationSchema.options, value);
  return parsed ? SPECIALIZATION_LABELS[parsed] : value;
}

export function labelForHospitalRole(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = parseStringEnumMember(hospitalRoleSchema.options, value);
  return parsed ? HOSPITAL_ROLE_LABELS[parsed] : value;
}

export function getVerificationBadgeVariant(
  status?: Doctor["verificationStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "VERIFIED") return "default";
  if (status === "FAILED" || status === "REJECTED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

export function getVerificationLabel(status?: Doctor["verificationStatus"]) {
  if (!status) return "Unverified";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function filterDoctors<T extends { name: string; email: string; specialization?: string }>(
  doctors: T[],
  search: string,
): T[] {
  return doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(search.toLowerCase()) ||
      doctor.email.toLowerCase().includes(search.toLowerCase()) ||
      (doctor.specialization &&
        labelForSpecialization(doctor.specialization)
          ?.toLowerCase()
          .includes(search.toLowerCase())),
  );
}

// --- URL builders extracted from the hook ---

export function doctorDetailsUrl(clinicId: string, doctorId: string): string {
  return `/internal/clinics/${clinicId}/doctors/${doctorId}`;
}
export function doctorVerifyUrl(doctorId: string): string {
  return `/internal/doctors/${doctorId}/admin-verify`;
}
export function doctorRejectUrl(doctorId: string): string {
  return `/internal/doctors/${doctorId}/admin-reject`;
}

// --- Error message constants extracted from the hook ---

export const LOAD_DOCTOR_DETAILS_ERROR = "We could not load these doctor details. Please try again.";
export const DOCTOR_REQUIRES_CLINIC_ERROR = "Choose a clinic before opening doctor details";
export const VERIFY_DOCTOR_ERROR = "We could not verify this doctor. Please try again.";
export const REJECT_DOCTOR_REASON_ERROR = "Enter a rejection reason before continuing.";
export const REJECT_DOCTOR_ERROR = "We could not reject this doctor. Please try again.";

export function buildPageMeta(
  loading: boolean,
  error: unknown,
  hasToken: boolean,
): { pageStatus: "loading" | "error" | "success"; errorMessage: string | undefined } {
  const pageStatus: "loading" | "error" | "success" = !hasToken || loading
    ? "loading"
    : error
      ? "error"
      : "success";
  const errorMessage = error
    ? getUserFacingErrorMessage(error, {
        context: "load",
        fallback: "We could not load doctors. Please try again.",
      })
    : undefined;
  return { pageStatus, errorMessage };
}
