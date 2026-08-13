import { type ReactNode } from "react";
import { AuthContext } from "./auth-context-inner";
import { useAuthProviderValue } from "./use-auth-provider-value";

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthProviderValue();

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
