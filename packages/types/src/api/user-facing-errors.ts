export type UserFacingErrorContext =
  | "generic"
  | "auth"
  | "load"
  | "save"
  | "delete"
  | "upload"
  | "payment"
  | "form"
  | "verification";

export interface UserFacingErrorOptions {
  fallback?: string;
  context?: UserFacingErrorContext;
}

const DEFAULT_ERROR_MESSAGE = "We could not complete this right now. Please try again.";

const CONTEXT_FALLBACKS: Record<UserFacingErrorContext, string> = {
  generic: DEFAULT_ERROR_MESSAGE,
  auth: "We could not sign you in. Please check your details and try again.",
  load: "We could not load this right now. Please refresh or try again.",
  save: "We could not save your changes. Please try again.",
  delete: "We could not remove this item. Please try again.",
  upload: "We could not upload the file. Please try again.",
  payment: "We could not complete the payment. Please try again.",
  form: "Please check the highlighted fields and try again.",
  verification: "We could not verify the code. Please try again.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Please check the information and try again.",
  401: "Please sign in again to continue.",
  403: "You do not have permission to do that.",
  404: "We could not find what you were looking for.",
  409: "This information changed. Please refresh and try again.",
  422: "Please check the highlighted fields and try again.",
  423: "Your account is temporarily locked. Please try again later.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: DEFAULT_ERROR_MESSAGE,
  502: DEFAULT_ERROR_MESSAGE,
  503: DEFAULT_ERROR_MESSAGE,
  504: DEFAULT_ERROR_MESSAGE,
};

const CODE_MESSAGES: Record<string, string> = {
  ACCOUNT_LOCKED: "Your account is temporarily locked. Please try again later.",
  APPOINTMENT_CONFLICT:
    "This time is no longer available. Please choose another time.",
  APPOINTMENT_NOT_FOUND: "We could not find that appointment.",
  CLINIC_NOT_FOUND: "We could not find that clinic.",
  DOCUMENT_NOT_FOUND: "We could not find that document.",
  DOCTOR_NOT_FOUND: "We could not find that doctor.",
  DUPLICATE_ENTRY: "This information already exists.",
  DATABASE_ERROR: DEFAULT_ERROR_MESSAGE,
  EXTERNAL_SERVICE_ERROR: DEFAULT_ERROR_MESSAGE,
  FEATURE_NOT_AVAILABLE: "This feature is not available for your account.",
  FORBIDDEN: "You do not have permission to do that.",
  INTERNAL_ERROR: DEFAULT_ERROR_MESSAGE,
  INSUFFICIENT_PERMISSIONS: "You do not have permission to do that.",
  INSUFFICIENT_TIER: "Your current plan does not include this feature.",
  INVALID_CREDENTIALS: "Incorrect email or password",
  INVALID_DATE_RANGE: "Please choose a valid date range.",
  INVALID_INPUT: "Please check the information and try again.",
  INVOICE_NOT_FOUND: "We could not find that invoice.",
  LICENSE_EXPIRED: "Please update the license details before continuing.",
  NETWORK_ERROR:
    "We could not connect right now. Please check your connection and try again.",
  NOT_FOUND: "We could not find what you were looking for.",
  PATIENT_NOT_FOUND: "We could not find that patient.",
  PRESCRIPTION_NOT_FOUND: "We could not find that prescription.",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Please wait a moment and try again.",
  SLOT_UNAVAILABLE: "This time is no longer available. Please choose another time.",
  SUBSCRIPTION_INACTIVE: "Please update your subscription to continue.",
  SUBSCRIPTION_LIMIT_REACHED:
    "Your current plan has reached its limit for this action.",
  SERVER_ERROR: DEFAULT_ERROR_MESSAGE,
  TIMEOUT: "We could not connect right now. Please try again.",
  TOKEN_EXPIRED: "Please sign in again to continue.",
  UNAUTHORIZED: "Please sign in again to continue.",
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
};

const TECHNICAL_MESSAGE_PATTERNS = [
  /^\s*error\s*$/i,
  /^\s*network(?:\s+error)?\s*$/i,
  /^\s*something went wrong\.?\s*(please try again\.?)?\s*$/i,
  /^\s*unknown error\s*$/i,
  /^\s*unexpected error\s*$/i,
  /^\s*we encountered an unexpected error\.?\s*(please try again\.?)?\s*$/i,
  /^\s*we could not load this information\.?\s*(please try again\.?)?\s*$/i,
  /^\s*we could not complete this action\.?\s*(please try again\.?)?\s*$/i,
  /^\s*we could not continue right now\.?\s*(please try again\.?)?\s*$/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bdatabase\b/i,
  /\bdb\b/i,
  /\bdigest\b/i,
  /\berror id\b/i,
  /\bevent id\b/i,
  /\bexception\b/i,
  /\bexternal service\b/i,
  /\bhttp\b/i,
  /\binternal error\b/i,
  /\bjson\b/i,
  /\bobject object\b/i,
  /\bonboarding session\b/i,
  /\bprovider\b/i,
  /\bprisma\b/i,
  /\brequest\b/i,
  /\bresponse\b/i,
  /\bschema\b/i,
  /\bserver\b/i,
  /\bstack\b/i,
  /\bstatus(?: code)?\b/i,
  /\btoken\b/i,
  /\btrace\b/i,
  /\bvalidation failed\b/i,
  /\bzod\b/i,
  /\b[A-Z][A-Za-z]+Error\b/,
  /\b\d{3}\b/,
  /\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+/,
  /https?:\/\//i,
  /\bat\s+\S+\s+\(.+:\d+:\d+\)/,
  /\n/,
];

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

function extractStatus(error: unknown): number | undefined {
  const record = toRecord(error);
  const directStatus = record?.status ?? record?.statusCode;
  if (typeof directStatus === "number") return directStatus;

  const data = toRecord(record?.data);
  const dataStatus = data?.status ?? data?.statusCode;
  return typeof dataStatus === "number" ? dataStatus : undefined;
}

function extractCode(error: unknown): string | undefined {
  const record = toRecord(error);
  const directCode = record?.code;
  if (typeof directCode === "string") return directCode;

  const data = toRecord(record?.data);
  const dataCode = data?.code;
  if (typeof dataCode === "string") return dataCode;

  const nestedError = toRecord(data?.error ?? record?.error);
  const nestedCode = nestedError?.code;
  return typeof nestedCode === "string" ? nestedCode : undefined;
}

function extractMessage(error: unknown): string | undefined {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const record = toRecord(error);
  const directMessage = record?.message;
  if (typeof directMessage === "string") return directMessage;

  const data = toRecord(record?.data);
  const dataMessage = data?.message ?? data?.detail;
  if (typeof dataMessage === "string") return dataMessage;

  const nestedError = toRecord(data?.error ?? record?.error);
  const nestedMessage = nestedError?.message;
  return typeof nestedMessage === "string" ? nestedMessage : undefined;
}

function polishUserFacingMessage(message: string): string {
  const withoutTrailingPeriod = message
    .trim()
    .replace(/\s+Please try again\.?$/i, "")
    .replace(/\.+$/, "");

  const failedMatch = withoutTrailingPeriod.match(
    /^Failed to (load|save|create|update|delete|remove|submit|approve|reject|cancel|withdraw|record|scan|download|process|initiate|schedule|complete|mark|resend|refresh|copy|add|sign|revoke)\s+(.+)$/i,
  );
  if (failedMatch?.[1] && failedMatch[2]) {
    return `We could not ${failedMatch[1].toLowerCase()} ${failedMatch[2]}. Please try again.`;
  }

  const errorCreatingMatch = withoutTrailingPeriod.match(
    /^Error (creating|saving|updating|deleting)\s+(.+)$/i,
  );
  if (errorCreatingMatch?.[1] && errorCreatingMatch[2]) {
    const verb = errorCreatingMatch[1].replace(/ing$/i, "e").toLowerCase();
    return `We could not ${verb} ${errorCreatingMatch[2]}. Please try again.`;
  }

  const unableMatch = withoutTrailingPeriod.match(/^Unable to\s+(.+)$/i);
  if (unableMatch?.[1]) {
    return `We could not ${unableMatch[1]}. Please try again.`;
  }

  const couldNotMatch = withoutTrailingPeriod.match(/^Could not\s+(.+)$/i);
  if (couldNotMatch?.[1]) {
    return `We could not ${couldNotMatch[1]}. Please try again.`;
  }

  return message.trim();
}

export function isTechnicalErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;

  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function sanitizeUserFacingMessage(
  message: string | null | undefined,
  fallback = DEFAULT_ERROR_MESSAGE,
): string {
  if (!message || isTechnicalErrorMessage(message)) {
    return fallback;
  }

  return polishUserFacingMessage(message);
}

export function getUserFacingErrorMessage(
  error: unknown,
  options: UserFacingErrorOptions = {},
): string {
  const context = options.context ?? "generic";
  const fallback = options.fallback ?? CONTEXT_FALLBACKS[context];
  const code = extractCode(error);

  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  const status = extractStatus(error);
  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  const message = extractMessage(error);
  return sanitizeUserFacingMessage(message, fallback);
}
