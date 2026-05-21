import type {
  InternalDashboardClinic,
  InternalPortalUser,
} from "@workspace/data-access/internal";
import type { Clinic, User } from "./types";

export function mapInternalClinicToUserClinic(
  clinic: InternalDashboardClinic,
): Clinic {
  return {
    id: clinic.id,
    name: clinic.name,
    currency: clinic.currency,
  };
}

export function mapInternalPortalUserToUser(user: InternalPortalUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    specialization: user.specialization,
    hospitalRole: user.hospitalRole,
    qualification: user.qualification,
    registrationNumber: user.registrationNumber,
    licenseNumber: user.licenseNumber,
    bio: user.bio,
    yearsOfExperience: user.yearsOfExperience,
    consultationFee: user.consultationFee,
    createdAt: user.createdAt,
    clinicId: user.clinicId,
  };
}
