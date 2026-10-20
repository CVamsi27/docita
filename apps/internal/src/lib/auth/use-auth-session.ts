import { useCallback, useEffect } from "react";
import { client } from "@/lib/api/api-client";
import { MAIN_APP_URL } from "@/lib/api/api-config";
import {
  createOutageRecoveryState,
  isPlatformOutageError,
  recoverFromApiOutage,
} from "@workspace/data-access";
import { getApiAvailabilityStore } from "@/lib/api/api-availability";
import { INTERNAL_USER_KEY, internalSession } from "./session";
import { isRecord } from "@workspace/utils";
import type { InternalUser } from "./use-auth-state";

function clearAuthStorage() {
  internalSession.clearSession();
}

function getMainAppLoginUrl() {
  return `${MAIN_APP_URL.replace(/\/$/, "")}/login`;
}

export { clearAuthStorage, getMainAppLoginUrl };

interface UseAuthSessionOptions {
  updateToken: (token: string | null) => void;
  updateUser: (user: InternalUser | null) => void;
  finishLoading: () => void;
  markMounted: () => void;
  resetAuth: () => void;
}

export function useAuthSession({
  updateToken,
  updateUser,
  finishLoading,
  markMounted,
  resetAuth,
}: UseAuthSessionOptions) {
  const validateTokenRequest = useCallback(
    () => client.get("/auth/validate"),
    [],
  );

  const isInternalRole = useCallback(
    (role?: string | null) => role === "INTERNAL",
    [],
  );

  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      await validateTokenRequest();
      return true;
    } catch (error) {
      const status =
        isRecord(error) && typeof error.status === "number"
          ? error.status
          : undefined;
      if (status === 404 || status === 401) {
        clearAuthStorage();
        return false;
      }
      if (status === 429) return true;
      if (isPlatformOutageError(error)) {
        // Platform outage, not an auth failure: rethrow so the bootstrap waits
        // for recovery instead of clearing a session the refresh cookie backs.
        throw error;
      }
      return false;
    }
  }, [validateTokenRequest]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      markMounted();

      const recovery = createOutageRecoveryState();

      try {
        const storedUser = localStorage.getItem(INTERNAL_USER_KEY);
        const storedToken = internalSession.getToken();

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (isInternalRole(parsedUser.role)) {
            // Validates with the in-memory token, refreshes once if needed, and
            // waits out platform outages (bounded) instead of dropping a
            // session the refresh cookie still backs.
            const validateWithRecovery = async (): Promise<boolean> => {
              if (storedToken) updateToken(storedToken);
              try {
                if (await validateToken()) return true;
                const refreshed = await internalSession.refreshAccessToken();
                const nextToken = internalSession.getToken();
                updateToken(nextToken);
                return !!(refreshed && nextToken && (await validateToken()));
              } catch (error) {
                if (!isPlatformOutageError(error)) return false;
                if (!(await recoverFromApiOutage(getApiAvailabilityStore, recovery))) {
                  return false;
                }
                return validateWithRecovery();
              }
            };

            if (await validateWithRecovery()) {
              updateUser(parsedUser);
            } else {
              clearAuthStorage();
              resetAuth();
            }
          } else {
            clearAuthStorage();
            window.location.replace(getMainAppLoginUrl());
          }
        }
      } catch {
        clearAuthStorage();
      }
      finishLoading();
    }, 0);

    return () => clearTimeout(timer);
  }, [
    isInternalRole,
    validateToken,
    updateToken,
    updateUser,
    finishLoading,
    markMounted,
    resetAuth,
  ]);

  return { validateToken, isInternalRole };
}
