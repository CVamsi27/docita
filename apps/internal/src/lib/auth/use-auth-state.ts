import { useCallback, useRef, useState } from "react";

export interface InternalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  clinicId?: string;
}

export function useAuthState() {
  const [user, setUser] = useState<InternalUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const logoutInFlightRef = useRef<Promise<void> | null>(null);
  const hasLoggedOutRef = useRef(false);

  const updateToken = useCallback((newToken: string | null) => {
    setToken(newToken);
  }, []);

  const updateUser = useCallback((newUser: InternalUser | null) => {
    setUser(newUser);
  }, []);

  const finishLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const markMounted = useCallback(() => {
    setIsMounted(true);
  }, []);

  const resetAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  return {
    user,
    token,
    isLoading,
    isMounted,
    logoutInFlightRef,
    hasLoggedOutRef,
    updateToken,
    updateUser,
    finishLoading,
    markMounted,
    resetAuth,
    setUser,
    setToken,
    setIsLoading,
  };
}
