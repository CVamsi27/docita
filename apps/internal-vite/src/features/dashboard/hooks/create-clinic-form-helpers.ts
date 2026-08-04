import type { ClinicType, InternalClinicAdminType, TierName } from "@workspace/types";

export type CreateClinicFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: TierName;
  type: ClinicType;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminType: InternalClinicAdminType;
};

export type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
};

export const INITIAL_FORM_DATA: CreateClinicFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  tier: "STARTER",
  type: "GENERAL",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  adminType: "admin",
};

const ERROR_FIELD_KEYS = new Set<keyof FieldErrors>([
  "name", "email", "phone", "address",
  "adminName", "adminEmail", "adminPassword",
]);

export function isErrorFieldKey(field: string): field is keyof FieldErrors {
  // check-as-cast-density: allow-file — react-hook-form FieldErrors key narrowing for membership check
  return ERROR_FIELD_KEYS.has(field as keyof FieldErrors);
}

export function validateCreateClinicForm(formData: CreateClinicFormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!formData.name.trim()) errors.name = "Enter the facility name";
  if (!formData.email.trim()) {
    errors.email = "Enter the facility email address";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "Enter a valid facility email address";
  }
  if (!formData.phone.trim()) errors.phone = "Enter a phone number";
  if (!formData.address.trim()) errors.address = "Enter the facility address";
  if (!formData.adminName.trim()) errors.adminName = "Enter the admin's name";
  if (!formData.adminEmail.trim()) {
    errors.adminEmail = "Enter the admin's email address";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
    errors.adminEmail = "Enter a valid admin email address";
  }
  if (!formData.adminPassword.trim()) {
    errors.adminPassword = "Enter a password for the admin";
  }
  return errors;
}
