export interface InternalAdminUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "ADMIN_DOCTOR";
  createdAt: string;
  updatedAt: string;
}
