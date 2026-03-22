import { SignatureUploadToken, SignaturePurpose } from '@workspace/db';

export type UploadTokenWithRelations = SignatureUploadToken & {
  doctor: {
    id: string;
    name: string;
    email: string;
    signatureUrl: string | null;
  } | null;
  clinic: {
    id: string;
    name: string;
    slaSignatureUrl: string | null;
  } | null;
};

export type ActiveTokenSummary = Pick<
  SignatureUploadToken,
  'id' | 'token' | 'expiresAt' | 'createdAt' | 'purpose'
>;

export interface ISignatureUploadRepository {
  findUserById(userId: string): Promise<{
    id: string;
    role: string;
    name: string;
    email: string;
  } | null>;

  findClinicById(clinicId: string): Promise<{
    id: string;
    name: string;
  } | null>;

  createUploadToken(data: {
    doctorId: string;
    clinicId?: string;
    token: string;
    expiresAt: Date;
    purpose: SignaturePurpose;
  }): Promise<SignatureUploadToken>;

  findTokenByValue(token: string): Promise<UploadTokenWithRelations | null>;

  findTokenById(
    id: string,
    doctorId: string,
  ): Promise<SignatureUploadToken | null>;

  findClinicTokenById(
    id: string,
    clinicId: string,
  ): Promise<SignatureUploadToken | null>;

  findActiveTokensByDoctor(doctorId: string): Promise<ActiveTokenSummary[]>;

  findActiveTokensByClinic(clinicId: string): Promise<ActiveTokenSummary[]>;

  markTokenUsed(token: string): Promise<void>;

  markTokenUsedById(id: string): Promise<void>;

  updateDoctorSignature(
    doctorId: string,
    signatureUrl: string,
    token: string,
  ): Promise<void>;

  updateClinicSignature(
    clinicId: string,
    signatureUrl: string,
    token: string,
  ): Promise<void>;
}

export const SIGNATURE_UPLOAD_REPOSITORY_TOKEN = Symbol(
  'ISignatureUploadRepository',
);
