"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error-reporting";

const getConsoleMessage = (args: unknown[]): string => {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.message;
      }
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ")
    .slice(0, 1000);
};

export function ClientErrorReporter() {
  useEffect(() => {
    const reportedKeys = new Map<string, number>();
    const shouldReport = true;
    const shouldPrintToConsole = false;

    const dedupe = (key: string): boolean => {
      const now = Date.now();
      const prev = reportedKeys.get(key);
      if (prev && now - prev < 5000) {
        return false;
      }
      reportedKeys.set(key, now);
      if (reportedKeys.size > 200) {
        const firstKey = reportedKeys.keys().next().value;
        if (firstKey) {
          reportedKeys.delete(firstKey);
        }
      }
      return true;
    };

    const report = (
      key: string,
      payload: {
        type: string;
        message: string;
        severity?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
        stack?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      if (!shouldReport || !dedupe(key)) {
        return;
      }

      void reportClientError({
        ...payload,
        path: window.location.pathname,
      });
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || "Unhandled error";
      const stack =
        event.error instanceof Error ? event.error.stack : undefined;
      report(`window-error:${message}:${stack ?? ""}`, {
        type: "WindowError",
        message,
        severity: "ERROR",
        stack,
        metadata: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      report(`promise-rejection:${message}:${stack ?? ""}`, {
        type: "UnhandledPromiseRejection",
        message,
        severity: "ERROR",
        stack,
      });
    };

    const originalConsoleLog = console.log.bind(console);
    const originalConsoleWarn = console.warn.bind(console);
    const originalConsoleError = console.error.bind(console);

    const patchedConsoleLog = (...args: unknown[]) => {
      if (shouldPrintToConsole) {
        originalConsoleLog(...args);
      }

      const message = getConsoleMessage(args);
      report(`console-log:${message}`, {
        type: "ConsoleLog",
        message,
        severity: "INFO",
      });
    };

    const patchedConsoleWarn = (...args: unknown[]) => {
      if (shouldPrintToConsole) {
        originalConsoleWarn(...args);
      }

      const message = getConsoleMessage(args);
      const firstError = args.find((arg): arg is Error => arg instanceof Error);
      report(`console-warn:${message}`, {
        type: "ConsoleWarning",
        message,
        severity: "WARNING",
        stack: firstError?.stack,
      });
    };

    const patchedConsoleError = (...args: unknown[]) => {
      if (shouldPrintToConsole) {
        originalConsoleError(...args);
      }

      const message = getConsoleMessage(args);
      const firstError = args.find((arg): arg is Error => arg instanceof Error);
      report(`console-error:${message}`, {
        type: "ConsoleError",
        message,
        severity: "ERROR",
        stack: firstError?.stack,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    console.log = patchedConsoleLog;
    console.warn = patchedConsoleWarn;
    console.error = patchedConsoleError;

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
