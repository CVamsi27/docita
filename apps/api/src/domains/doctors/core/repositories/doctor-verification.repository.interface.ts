import { DoctorVerificationStatus } from '@workspace/db';
import { JsonValue } from '@workspace/types';

export type DoctorForVerification = {
  id: string;
  name: string;
  role: string;
  registrationNumber: string | null;
  licenseNumber: string | null;
};

export type DoctorVerificationRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  registrationNumber: string | null;
  licenseNumber: string | null;
  signatureUrl: string | null;
  signatureUploadedAt: Date | null;
  verificationStatus: DoctorVerificationStatus;
  verificationSource: string | null;
  verificationRef: string | null;
  verificationReason: string | null;
  verificationData: JsonValue | null;
  verificationCheckedAt: Date | null;
  updatedAt: Date;
};

export interface IDoctorVerificationRepository {
  findDoctorForVerification(
    doctorId: string,
  ): Promise<DoctorForVerification | null>;

  findDoctorVerificationRecord(
    doctorId: string,
  ): Promise<DoctorVerificationRecord | null>;

  findDoctorLicenseExpiry(
    doctorId: string,
  ): Promise<{ licenseExpiry: Date | null } | null>;

  findDoctorsForReverification(): Promise<Array<{ id: string }>>;

  updateVerificationStatus(
    doctorId: string,
    data: {
      verificationStatus: DoctorVerificationStatus;
      verificationSource?: string;
      verificationRef?: string | null;
      verificationReason?: string | null;
      verificationData?: JsonValue;
      verificationCheckedAt: Date;
    },
  ): Promise<void>;
}

export const DOCTOR_VERIFICATION_REPOSITORY_TOKEN = Symbol(
  'IDoctorVerificationRepository',
);
