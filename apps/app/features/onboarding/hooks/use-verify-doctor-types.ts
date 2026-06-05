import type {
  Clinic,
  UpdateDoctorRegistrationRequest,
  User,
} from "@workspace/types";
import type { useAPIQuery, useAPIMutation } from "@/lib/api/api-core";

export interface RegistrationInputState {
  registrationNumber: string;
  setRegistrationNumber: (value: string) => void;
  registrationCouncil: string;
  setRegistrationCouncil: (value: string) => void;
  registrationStateCode: string;
  setRegistrationStateCode: (value: string) => void;
  registrationError: string | null;
  setRegistrationError: (value: string | null) => void;
}

export interface VerifyDoctorQueries {
  doctorProfile: User | undefined;
  profileLoading: boolean;
  refetch: ReturnType<typeof useAPIQuery<User>>["refetch"];
  clinic: Clinic | undefined;
  clinicLoading: boolean;
  updateDoctorRegistration: ReturnType<
    typeof useAPIMutation<User, UpdateDoctorRegistrationRequest>
  >;
  updateDoctorSignature: ReturnType<
    typeof useAPIMutation<User, { signatureUrl: string }>
  >;
}
