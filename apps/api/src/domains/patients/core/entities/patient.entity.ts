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
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

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
    this.metadata = props.metadata || {};
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.version = props.version;

    this.validate();
  }

  private validate(): void {
    if (!this.clinicId) throw new Error('Clinic ID is required');
    if (!this.firstName || !this.lastName)
      throw new Error('Patient name is required');
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getMrn(): string | undefined {
    return this.mrn;
  }

  updateContactInfo(email?: string, phone?: string): void {
    this.email = email;
    this.phoneNumber = phone;
    this.updatedAt = new Date();
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
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
