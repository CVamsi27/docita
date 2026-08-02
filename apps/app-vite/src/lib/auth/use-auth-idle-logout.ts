import { useEffect } from "react";
import type { NavigateFunction } from "react-router";
import { appSession } from "./session";

const IDLE_LOGOUT_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

export function useAuthIdleLogout(options: {
  isAuthenticated: boolean;
  pathname: string | null;
  logout: (opts?: { redirect?: boolean }) => Promise<void>;
  navigate: NavigateFunction;
}): void {
  const { isAuthenticated, pathname, logout } = options;
  useEffect(() => {
    if (!isAuthenticated) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let deadlineMs = 0;

    const scheduleLogout = () => {
      if (!deadlineMs) return;
      if (timeoutId) clearTimeout(timeoutId);
      const remaining = deadlineMs - Date.now();
      const nextDelay = Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS);

      timeoutId = setTimeout(() => {
        const stillRemaining = deadlineMs - Date.now();
        if (stillRemaining > 0) {
          scheduleLogout();
          return;
        }
        const isPublicRoute =
          !!pathname &&
          typeof appSession.isPublicPath === "function" &&
          appSession.isPublicPath(pathname);
        void logout({ redirect: !isPublicRoute });
      }, nextDelay);
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      deadlineMs = Date.now() + IDLE_LOGOUT_MS;
      scheduleLogout();
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, logout, pathname]);
}