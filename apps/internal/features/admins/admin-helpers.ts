import type { InternalClinicAdminType } from "@workspace/types";

export const ADMIN_TYPE_LABELS = {
  admin: "Clinic Admin",
  admin_doctor: "Admin Doctor",
} as const;

export function getRoleLabel(role: string): string {
  return role === "ADMIN_DOCTOR"
    ? ADMIN_TYPE_LABELS.admin_doctor
    : ADMIN_TYPE_LABELS.admin;
}

export function getRoleBadgeVariant(role: string) {
  return role === "ADMIN_DOCTOR" ? "default" : "outline";
}

export function filterAdmins<T extends { name: string; email: string }>(
  admins: T[],
  search: string,
  _clinicId: string,
): T[] {
  if (!search) return admins;
  const lower = search.toLowerCase();
  return admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(lower) ||
      admin.email.toLowerCase().includes(lower),
  );
}

export function buildPageStatus(
  loading: boolean,
  loadError: string | null,
): "loading" | "error" | "success" {
  return loading ? "loading" : loadError ? "error" : "success";
}

export interface CreateForm {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  adminType: InternalClinicAdminType;
}

export interface EditForm {
  name: string;
  email: string;
  phoneNumber: string;
  adminType: InternalClinicAdminType;
}

export const ADMIN_CREATE_SUCCESS = "Admin created successfully";
export const ADMIN_UPDATE_SUCCESS = "Admin updated successfully";
export const ADMIN_DEACTIVATE_SUCCESS = "Admin deactivated. They can no longer sign in.";
export const ADMIN_ACTIVATE_SUCCESS = "Admin re-enabled for sign-in.";
export const DEACTIVATE_CONFIRM_MESSAGE = "Deactivate this admin? They will not be able to sign in until re-enabled.";

export const CREATE_MISSING_FIELDS_ERROR = "Enter the admin's name, email, and password before continuing";
export const CREATE_GENERIC_ERROR = "We could not create this admin account. Please try again.";
export const EDIT_MISSING_FIELDS_ERROR = "Enter the admin's name and email before saving";
export const EDIT_GENERIC_ERROR = "We could not save this admin account. Please try again.";
export const DEACTIVATE_GENERIC_ERROR = "We could not deactivate this admin account. Please try again.";
export const ACTIVATE_GENERIC_ERROR = "We could not re-enable this admin account. Please try again.";

export function validateCreateForm(form: CreateForm): string | null {
  if (!form.name || !form.email || !form.password) {
    return CREATE_MISSING_FIELDS_ERROR;
  }
  return null;
}

export function validateEditForm(form: EditForm): string | null {
  if (!form.name || !form.email) {
    return EDIT_MISSING_FIELDS_ERROR;
  }
  return null;
}
