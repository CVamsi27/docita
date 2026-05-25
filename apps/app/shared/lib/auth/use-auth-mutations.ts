"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/api-client";
import { appSession } from "@/lib/auth/session";

function csrfHeaders(): HeadersInit | undefined {
  const csrfToken = appSession.getCsrfToken();
  return csrfToken ? { "x-xsrf-token": csrfToken } : undefined;
}

export function useAuthMutations() {
  const validateAuth = useMutation({
    mutationFn: (headers?: HeadersInit) =>
      apiFetch<unknown>("/auth/validate", {
        method: "GET",
        headers,
      }),
  });

  const loginMutation = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<unknown>("/auth/login", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(payload),
      }),
  });

  const checkEmailMutation = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<unknown>("/auth/check-email", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(payload),
      }),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<unknown>("/auth/register", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(payload),
      }),
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<unknown>("/auth/logout", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({}),
      }),
  });

  return {
    validateAuth: validateAuth.mutateAsync,
    loginMutation,
    checkEmailMutation,
    registerMutation,
    logoutMutation,
  };
}
