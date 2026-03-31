export type SeverityLevel =
  | "fatal"
  | "error"
  | "warning"
  | "log"
  | "info"
  | "debug";

export function init(_options: Record<string, unknown>) {}

export function setUser(_user: unknown) {}

export function setTag(_key: string, _value: unknown) {}

export function captureException(
  _error: unknown,
  _context?: Record<string, unknown>,
) {
  return undefined;
}

export function captureMessage(_message: string, _level?: SeverityLevel) {}

export function addBreadcrumb(_breadcrumb: Record<string, unknown>) {}
