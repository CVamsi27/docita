import { createContext } from "react";
import type { InternalUser } from "./use-auth-state";

interface AuthContextType {
  user: InternalUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInternal: boolean;
  login: (token: string | null, user: InternalUser) => void;
  logout: (reason?: string) => void;
  validateToken: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
