export interface DoctorContextSnapshot {
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: string | null;
  doctorRole?: string | null;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
}

interface UserRecord {
  name?: string;
  email?: string;
  phoneNumber?: string;
  specialization?: string | null;
  role?: string | null;
  registrationNumber?: string | null;
  licenseNumber?: string | null;
}

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

export const DOCTOR_CONTEXT_SELECT = {
  name: true,
  email: true,
  phoneNumber: true,
  specialization: true,
  role: true,
  registrationNumber: true,
  licenseNumber: true,
} as const;
