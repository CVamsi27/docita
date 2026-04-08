import { ClinicTier } from '@workspace/db';

export class InternalCreateClinicDto {
  name!: string;
  email!: string;
  phone!: string;
  address!: string;
  adminName!: string;
  adminEmail!: string;
  adminPassword!: string;
  tier?: ClinicTier;
  type?: string;
}

export class InternalUpdateClinicDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tier?: ClinicTier;
  type?: string;
  active?: boolean;
}

export class CreateAdminDto {
  clinicId!: string;
  name!: string;
  email!: string;
  password!: string;
  phoneNumber?: string;
  adminType!: 'admin' | 'admin_doctor';
}

export class UpdateAdminDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  adminType?: 'admin' | 'admin_doctor';
}
