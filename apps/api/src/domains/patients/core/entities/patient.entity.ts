import { getPatientFullName } from '@workspace/utils';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export interface PatientProps {
  id: string;
  clinicId: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  gender: string;
  dateOfBirth?: Date;
  address?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceGroupNumber?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

type PatientProfileUpdate = Partial<
  Pick<
    PatientProps,
    | 'mrn'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phoneNumber'
    | 'gender'
    | 'dateOfBirth'
    | 'address'
    | 'insuranceProvider'
    | 'insurancePolicyNumber'
    | 'insuranceGroupNumber'
    | 'metadata'
  >
>;

export class Patient {
  readonly id: string;
  readonly clinicId: string;
  private mrn?: string;
  private firstName: string;
  private lastName: string;
  private email?: string;
  private phoneNumber?: string;
  private gender: string;
  private dateOfBirth?: Date;
  private address?: string;
  private insuranceProvider?: string;
  private insurancePolicyNumber?: string;
  private insuranceGroupNumber?: string;
  private metadata: Record<string, unknown>;
  readonly createdAt: Date;
  private updatedAt: Date;
  readonly version: number;

  constructor(props: PatientProps) {
    this.id = props.id;
    this.clinicId = props.clinicId;
    this.mrn = props.mrn;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.phoneNumber = props.phoneNumber;
    this.gender = props.gender;
    this.dateOfBirth = props.dateOfBirth;
    this.address = props.address;
    this.insuranceProvider = props.insuranceProvider;
    this.insurancePolicyNumber = props.insurancePolicyNumber;
// jscpd:ignore-start
    this.insuranceGroupNumber = props.insuranceGroupNumber;
    this.metadata = props.metadata || {};
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.version = props.version;

    this.validate();
  }

  private validate(): void {
    if (!this.clinicId)
// jscpd:ignore-end
      throw new InvariantViolationError('Clinic ID is required');
    if (!this.firstName || !this.lastName)
      throw new InvariantViolationError('Patient name is required');
  }

  /** Trim MRN; empty strings become undefined. */
  static normalizeMrn(mrn: string | undefined): string | undefined {
    const normalized = mrn?.trim();
    return normalized ? normalized : undefined;
  }

  /** Trim display label for patient tags. */
  static normalizeTagLabel(tag: string): string {
    return tag.trim();
  }

  static isTagLabelValid(tag: string): boolean {
    return Patient.normalizeTagLabel(tag).length > 0;
  }

  getFullName(): string {
    return getPatientFullName({
      firstName: this.firstName,
      lastName: this.lastName,
    });
  }

  getMrn(): string | undefined {
    return this.mrn;
  }

  updateContactInfo(now: Date, email?: string, phone?: string): void {
    this.email = email;
    this.phoneNumber = phone;
    this.updatedAt = now;
  }

  updateProfile(data: PatientProfileUpdate, now: Date): void {
    if (data.mrn !== undefined) this.mrn = data.mrn;
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.lastName !== undefined) this.lastName = data.lastName;
    if (data.email !== undefined) this.email = data.email;
    if (data.phoneNumber !== undefined) this.phoneNumber = data.phoneNumber;
    if (data.gender !== undefined) this.gender = data.gender;
    if (data.dateOfBirth !== undefined) this.dateOfBirth = data.dateOfBirth;
    if (data.address !== undefined) this.address = data.address;
    if (data.insuranceProvider !== undefined)
      this.insuranceProvider = data.insuranceProvider;
    if (data.insurancePolicyNumber !== undefined)
      this.insurancePolicyNumber = data.insurancePolicyNumber;
    if (data.insuranceGroupNumber !== undefined)
      this.insuranceGroupNumber = data.insuranceGroupNumber;
    if (data.metadata !== undefined) this.metadata = data.metadata;

    this.updatedAt = now;
    this.validate();
  }

  toPlain() {
    return {
      id: this.id,
      clinicId: this.clinicId,
      mrn: this.mrn,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      gender: this.gender,
      dateOfBirth: this.dateOfBirth,
      address: this.address,
      insuranceProvider: this.insuranceProvider,
      insurancePolicyNumber: this.insurancePolicyNumber,
      insuranceGroupNumber: this.insuranceGroupNumber,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
