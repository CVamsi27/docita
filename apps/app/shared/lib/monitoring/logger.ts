type LogContext = Record<string, unknown> | unknown;

function recordClientLog(_level: "info" | "warn" | "error", _message: string, _context?: LogContext) {
  // Centralized no-op until a non-console browser log sink is wired in.
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    recordClientLog("info", message, context);
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    recordClientLog("warn", message, context);
  },
  error: (message: string, context?: LogContext) => {
    recordClientLog("error", message, context);
  },
};
