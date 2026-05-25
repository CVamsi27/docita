import { Patient, PatientOtp, User } from '@workspace/db';

export type PatientProfile = Pick<
  Patient,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'preferredName'
  | 'email'
  | 'phoneNumber'
  | 'dateOfBirth'
  | 'gender'
  | 'bloodGroup'
  | 'address'
  | 'mrn'
  | 'preferredLanguage'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelation'
  | 'whatsappConsent'
  | 'whatsappConsentAt'
  | 'createdAt'
>;

export type PatientSummary = Pick<
  Patient,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phoneNumber'
  | 'dateOfBirth'
  | 'gender'
  | 'bloodGroup'
  | 'mrn'
>;

export type PatientWithUser = Patient & { user: User | null };

export type OtpRecord = Pick<
  PatientOtp,
  | 'id'
  | 'phoneNumber'
  | 'otpHash'
  | 'expiresAt'
  | 'attempts'
  | 'usedAt'
  | 'createdAt'
>;
