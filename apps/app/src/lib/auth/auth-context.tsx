import { type ReactNode } from "react";
import { VERIFICATION_EMAIL_STATUS_STORAGE_KEY, type User } from "./auth-context-helpers";
import { AuthContext } from "./auth-context-inner";
import { useAuthProviderValue } from "./use-auth-provider-value";

export { VERIFICATION_EMAIL_STATUS_STORAGE_KEY };
export type { User };
export { useAuth, useOptionalAuth } from "./auth-hooks";

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthProviderValue();

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}