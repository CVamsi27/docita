"use client";

import { createContext, type ReactNode, useContext } from "react";
import {
  VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
  type User,
} from "./auth-context-helpers";
import type { AuthContextType } from "./auth-context.types";
import { useAuthProviderValue } from "./use-auth-provider-value";

export { VERIFICATION_EMAIL_STATUS_STORAGE_KEY };
export type { User };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthProviderValue();

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
