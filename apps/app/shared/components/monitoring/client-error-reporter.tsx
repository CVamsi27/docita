"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  reportClientError,
  type ClientErrorPayload,
} from "@/lib/monitoring/client-error-reporting";

const DEDUPE_WINDOW_MS = 5000;
const MAX_DEDUPE_KEYS = 200;

const getConsoleMessage = (args: unknown[]): string => {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ")
    .slice(0, 1000);
};

const isMonitoringNoiseMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("/monitoring/client-errors") ||
    normalized.includes("client-error-reporting.ts")
  );
};

type ReportPayload = Omit<ClientErrorPayload, "path">;
type ReportFn = (key: string, payload: ReportPayload) => void;

/**
 * Owns the dedupe window that keeps the same error/console-message from being
 * reported repeatedly within a short burst — every reporting path (window
 * errors, promise rejections, patched console methods) funnels through this
 * single deduped `report`. Extracted from `ClientErrorReporter` so the
 * dedupe bookkeeping isn't tangled with what triggers a report.
 */
function useDedupedClientErrorReporter(): ReportFn {
  const reportedKeysRef = useRef(new Map<string, number>());

  return useCallback((key, payload) => {
    const reportedKeys = reportedKeysRef.current;
    const now = Date.now();
    const prev = reportedKeys.get(key);
    if (prev && now - prev < DEDUPE_WINDOW_MS) return;
    reportedKeys.set(key, now);
    if (reportedKeys.size > MAX_DEDUPE_KEYS) {
      const firstKey = reportedKeys.keys().next().value;
      if (firstKey) reportedKeys.delete(firstKey);
    }
    void reportClientError({ ...payload, path: window.location.pathname });
  }, []);
}

/**
 * Wires up the `window` `error`/`unhandledrejection` listeners — the two
 * "the page itself blew up" signals — and tears them down on unmount.
 * Self-contained: its only shared dependency is the deduped `report`.
 */
function useWindowErrorReporting(report: ReportFn): void {
  useEffect(() => {
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

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [report]);
}

interface ConsoleReportConfig {
  type: string;
  severity: "WARNING" | "ERROR";
  keyPrefix: string;
  isEnabled: boolean;
}

/**
 * Reports a captured `console.warn`/`console.error` call through the deduped
 * `report`, after the noise filter and the feature's enable gate — the two
 * patched console methods were near-identical copies of this exact "filter,
 * gate, extract first error, report" shape (differing only in the report
 * type, severity, key prefix, and gate condition), so the shared shape is
 * named once and parameterized instead of duplicated twice.
 */
function reportFilteredConsoleMessage(
  report: ReportFn,
  args: unknown[],
  config: ConsoleReportConfig,
): void {
  const message = getConsoleMessage(args);
  if (isMonitoringNoiseMessage(message) || !config.isEnabled) return;
  const firstError = args.find((arg): arg is Error => arg instanceof Error);
  report(`${config.keyPrefix}:${message}`, {
    type: config.type,
    message,
    severity: config.severity,
    stack: firstError?.stack,
  });
}

/**
 * Patches `console.log`/`warn`/`error` to mirror their output into the
 * deduped reporting pipeline (gated by env-configured capture flags), and
 * restores the originals on unmount. Self-contained: its only shared
 * dependency is the deduped `report`.
 */
function useConsolePatching(report: ReportFn): void {
  useEffect(() => {
    const shouldPrintToConsole = true;
    const captureConsoleInfo =
      process.env.NEXT_PUBLIC_CAPTURE_CONSOLE_INFO === "true";
    const captureConsoleWarnings =
      process.env.NEXT_PUBLIC_CAPTURE_CONSOLE_WARNINGS === "true";

    const consoleRef = globalThis.console;
    const originalConsoleLog = consoleRef.log.bind(consoleRef);
    const originalConsoleWarn = consoleRef.warn.bind(consoleRef);
    const originalConsoleError = consoleRef.error.bind(consoleRef);

    const patchedConsoleLog = (...args: unknown[]) => {
      if (shouldPrintToConsole) originalConsoleLog(...args);
      if (!captureConsoleInfo) return;
      const message = getConsoleMessage(args);
      report(`console-log:${message}`, {
        type: "ConsoleLog",
        message,
        severity: "INFO",
      });
    };

    const patchedConsoleWarn = (...args: unknown[]) => {
      if (shouldPrintToConsole) originalConsoleWarn(...args);
      reportFilteredConsoleMessage(report, args, {
        type: "ConsoleWarning",
        severity: "WARNING",
        keyPrefix: "console-warn",
        isEnabled: captureConsoleWarnings,
      });
    };

    const patchedConsoleError = (...args: unknown[]) => {
      if (shouldPrintToConsole) originalConsoleError(...args);
      reportFilteredConsoleMessage(report, args, {
        type: "ConsoleError",
        severity: "ERROR",
        keyPrefix: "console-error",
        isEnabled: true,
      });
    };

    // Patch log/warn only when capturing is enabled. Otherwise Next.js and other
    // dev tooling logs would appear to come from this file and obscure real sources.
    if (captureConsoleInfo) consoleRef.log = patchedConsoleLog;
    if (captureConsoleWarnings) consoleRef.warn = patchedConsoleWarn;
    consoleRef.error = patchedConsoleError;

    return () => {
      if (captureConsoleInfo) consoleRef.log = originalConsoleLog;
      if (captureConsoleWarnings) consoleRef.warn = originalConsoleWarn;
      consoleRef.error = originalConsoleError;
    };
  }, [report]);
}

export function ClientErrorReporter() {
  const report = useDedupedClientErrorReporter();
  useWindowErrorReporting(report);
  useConsolePatching(report);
  return null;
}
