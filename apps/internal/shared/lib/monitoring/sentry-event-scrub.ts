import { redactPhi, redactString } from "./sentry-phi-redactor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function scrubMutableSentryRecord(record: Record<string, unknown>): void {
  const request = record.request;
  if (isRecord(request)) {
    if (request.data !== undefined) {
      request.data = redactPhi(request.data);
    }
    if (typeof request.query_string === "string") {
      request.query_string = redactString(request.query_string);
    } else if (request.query_string !== undefined) {
      request.query_string = redactPhi(request.query_string);
    }
    if (request.headers !== undefined) {
      request.headers = redactPhi(request.headers);
    }
    if (request.cookies !== undefined) {
      request.cookies = redactPhi(request.cookies);
    }
  }

  if (record.extra !== undefined) {
    record.extra = redactPhi(record.extra);
  }
  if (record.contexts !== undefined) {
    record.contexts = redactPhi(record.contexts);
  }
  if (record.tags !== undefined) {
    record.tags = redactPhi(record.tags);
  }

  if (Array.isArray(record.breadcrumbs)) {
    record.breadcrumbs = record.breadcrumbs.map((crumb) => {
      if (!isRecord(crumb)) {
        return crumb;
      }
      if (typeof crumb.message === "string") {
        crumb.message = redactString(crumb.message);
      }
      if (crumb.data !== undefined) {
        crumb.data = redactPhi(crumb.data);
      }
      return crumb;
    });
  }

  if (typeof record.message === "string") {
    record.message = redactString(record.message);
  }
}

export function scrubSentryEventRecord<T>(event: T): T {
  if (!isRecord(event)) {
    return event;
  }

  scrubMutableSentryRecord(event);
  return event;
}
