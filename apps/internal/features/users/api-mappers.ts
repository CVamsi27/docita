import type { InternalPortalUser } from "@workspace/data-access/internal";
import type { User } from "./types";

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
