"use client";

import { useCallback, useEffect } from "react";
import { client } from "../api/api-client";
import { INTERNAL_USER_KEY, internalSession } from "./session";
import { isRecord } from "@workspace/utils";
import { MAIN_APP_URL } from "../api/api-config";

function clearAuthStorage() {
  internalSession.clearSession();
}

function getMainAppLoginUrl() {
  return `${MAIN_APP_URL.replace(/\/$/, "")}/login`;
}

export { clearAuthStorage, getMainAppLoginUrl };

interface UseAuthSessionOptions {
  updateToken: (token: string | null) => void;
  updateUser: (user: { id: string; name: string; email: string; role: string; clinicId?: string } | null) => void;
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
      return false;
    }
  }, [validateTokenRequest]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      markMounted();

      try {
        const storedUser = localStorage.getItem(INTERNAL_USER_KEY);
        const storedToken = internalSession.getToken();

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (isInternalRole(parsedUser.role)) {
            if (storedToken) {
              updateToken(storedToken);
              const isValid = await validateToken();
              if (isValid) {
                updateUser(parsedUser);
              } else {
                const refreshed = await internalSession.refreshAccessToken();
                const nextToken = internalSession.getToken();
                updateToken(nextToken);
                if (refreshed && nextToken && (await validateToken())) {
                  updateUser(parsedUser);
                } else {
                  clearAuthStorage();
                  resetAuth();
                }
              }
            } else {
              const refreshed = await internalSession.refreshAccessToken();
              const nextToken = internalSession.getToken();
              updateToken(nextToken);
              if (refreshed && nextToken && (await validateToken())) {
                updateUser(parsedUser);
              } else {
                clearAuthStorage();
                resetAuth();
              }
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
  }, [isInternalRole, validateToken, updateToken, updateUser, finishLoading, markMounted, resetAuth]);

  return { validateToken, isInternalRole };
}
