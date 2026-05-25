import type { User } from "./auth-context-helpers";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isLoginLocked: boolean;
  loginLockoutUntil: number | null;
  refreshUser: () => Promise<User | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: "ADMIN" | "ADMIN_DOCTOR",
    clinicName?: string,
  ) => Promise<void>;
  checkEmail: (email: string) => Promise<boolean>;
  logout: (options?: { redirect?: boolean }) => Promise<void>;
  token: string | null;
}
