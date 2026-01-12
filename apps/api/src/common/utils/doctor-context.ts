/**
 * Doctor context snapshot for audit trail.
 *
 * When creating prescriptions or invoices, we capture the doctor's
 * information at the time of creation so it persists even if the
 * doctor's profile changes later.
 *
 * This utility consolidates the duplicated doctor context handling
 * found in InvoicesService and PrescriptionsService.
 */
export interface DoctorContextSnapshot {
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: string | null;
  doctorRole?: string | null;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
}

/**
 * User record shape (from Prisma)
 */
interface UserRecord {
  name?: string;
  email?: string;
  phoneNumber?: string;
  specialization?: string | null;
  role?: string | null;
  registrationNumber?: string | null;
  licenseNumber?: string | null;
}

/**
 * Extract doctor context from a user record.
 *
 * @param user - The user/doctor record from database
 * @returns Standardized doctor context snapshot
 *
 * @example
 * ```typescript
 * const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
 * const context = extractDoctorContext(doctor);
 * await prisma.prescription.create({
 *   data: {
 *     ...data,
 *     ...context,
 *   },
 * });
 * ```
 */
export function extractDoctorContext(
  user: UserRecord | null | undefined,
): DoctorContextSnapshot {
  if (!user) {
    return {};
  }

  return {
    doctorName: user.name,
    doctorEmail: user.email,
    doctorPhone: user.phoneNumber,
    doctorSpecialization: user.specialization ?? null,
    doctorRole: user.role ?? null,
    doctorRegistrationNumber: user.registrationNumber ?? undefined,
    doctorLicenseNumber: user.licenseNumber ?? undefined,
  };
}

/**
 * Extract doctor context from input data (DTO).
 * Filters out undefined values for cleaner Prisma input.
 *
 * @param data - Input data containing doctor context fields
 * @returns Clean doctor context for database insert
 */
export function extractDoctorContextFromInput(
  data: Partial<DoctorContextSnapshot>,
): DoctorContextSnapshot {
  const result: DoctorContextSnapshot = {};

  if (data.doctorName !== undefined) result.doctorName = data.doctorName;
  if (data.doctorEmail !== undefined) result.doctorEmail = data.doctorEmail;
  if (data.doctorPhone !== undefined) result.doctorPhone = data.doctorPhone;
  if (data.doctorSpecialization !== undefined) {
    result.doctorSpecialization = data.doctorSpecialization ?? null;
  }
  if (data.doctorRole !== undefined) {
    result.doctorRole = data.doctorRole ?? null;
  }
  if (data.doctorRegistrationNumber !== undefined) {
    result.doctorRegistrationNumber = data.doctorRegistrationNumber;
  }
  if (data.doctorLicenseNumber !== undefined) {
    result.doctorLicenseNumber = data.doctorLicenseNumber;
  }

  return result;
}

/**
 * Select fields for fetching doctor context from user table
 */
export const DOCTOR_CONTEXT_SELECT = {
  name: true,
  email: true,
  phoneNumber: true,
  specialization: true,
  role: true,
  registrationNumber: true,
  licenseNumber: true,
} as const;
