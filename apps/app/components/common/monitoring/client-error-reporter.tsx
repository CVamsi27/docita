"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error-reporting";
import { toast } from "sonner";

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
    const shouldPrintToConsole = true;
    const captureConsoleInfo =
      process.env.NEXT_PUBLIC_CAPTURE_CONSOLE_INFO === "true";
    const captureConsoleWarnings =
      process.env.NEXT_PUBLIC_CAPTURE_CONSOLE_WARNINGS === "true";
    const showConsoleToasts =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_ENABLE_CONSOLE_TOASTS === "true";

    const isInternalRuntimeMessage = (message: string): boolean => {
      const normalized = message.toLowerCase();
      return (
        normalized.includes("fast refresh") ||
        normalized.includes("rebuild") ||
        normalized.includes("[hmr]") ||
        normalized.includes("next.js") ||
        normalized.includes("turbopack") ||
        normalized.includes("react-query") ||
        normalized.includes("cache bypass, force executing") ||
        normalized.includes("pnpm") ||
        normalized.includes("next dev")
      );
    };

    const isMonitoringNoiseMessage = (message: string): boolean => {
      const normalized = message.toLowerCase();
      return (
        normalized.includes("/monitoring/client-errors") ||
        normalized.includes("client-error-reporting.ts")
      );
    };

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

    const consoleRef = globalThis.console;
    const originalConsoleLog = consoleRef.log.bind(consoleRef);
    const originalConsoleWarn = consoleRef.warn.bind(consoleRef);
    const originalConsoleError = consoleRef.error.bind(consoleRef);

    const patchedConsoleLog = (...args: unknown[]) => {
      if (shouldPrintToConsole) {
        originalConsoleLog(...args);
      }

      const message = getConsoleMessage(args);

      if (showConsoleToasts && !isInternalRuntimeMessage(message)) {
        toast(message);
      }

      if (captureConsoleInfo) {
        report(`console-log:${message}`, {
          type: "ConsoleLog",
          message,
          severity: "INFO",
        });
      }
    };

    const patchedConsoleWarn = (...args: unknown[]) => {
      if (shouldPrintToConsole) {
        originalConsoleWarn(...args);
      }

      const message = getConsoleMessage(args);
      if (isMonitoringNoiseMessage(message)) {
        return;
      }

      if (showConsoleToasts && !isInternalRuntimeMessage(message)) {
        toast.warning(message);
      }

      if (captureConsoleWarnings) {
        const firstError = args.find((arg): arg is Error => arg instanceof Error);
        report(`console-warn:${message}`, {
          type: "ConsoleWarning",
          message,
          severity: "WARNING",
          stack: firstError?.stack,
        });
      }
    };

    const patchedConsoleError = (...args: unknown[]) => {
      if (shouldPrintToConsole) {
        originalConsoleError(...args);
      }

      const message = getConsoleMessage(args);
      if (isMonitoringNoiseMessage(message)) {
        return;
      }

      if (showConsoleToasts && !isInternalRuntimeMessage(message)) {
        toast.error(message);
      }

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
    consoleRef.log = patchedConsoleLog;
    consoleRef.warn = patchedConsoleWarn;
    consoleRef.error = patchedConsoleError;

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      consoleRef.log = originalConsoleLog;
      consoleRef.warn = originalConsoleWarn;
      consoleRef.error = originalConsoleError;
    };
  }, []);

  return null;
}
