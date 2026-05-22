export interface InternalAdminUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  role: "ADMIN" | "ADMIN_DOCTOR";
  appLoginDisabled: boolean;
  createdAt: string;
  updatedAt: string;
}
