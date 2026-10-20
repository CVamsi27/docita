import {
  REDACTED,
  redactMonitoringUrl,
  redactPhiDeep as redactPhi,
  redactString,
} from "./phi-scrubber.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scrubMutableSentryRecord(record: Record<string, unknown>): void {
  const request = record["request"];
  if (isRecord(request)) {
    if (typeof request["url"] === "string") {
      request["url"] = redactMonitoringUrl(request["url"]);
    }
    if (request["data"] !== undefined) {
      request["data"] = redactPhi(request["data"]);
    }
    if (request["query_string"] !== undefined) {
      request["query_string"] = REDACTED;
    }
    if (request["headers"] !== undefined) {
      request["headers"] = redactPhi(request["headers"]);
    }
    if (request["cookies"] !== undefined) {
      request["cookies"] = redactPhi(request["cookies"]);
    }
  }

  if (record["extra"] !== undefined) {
    record["extra"] = redactPhi(record["extra"]);
  }
  if (record["contexts"] !== undefined) {
    record["contexts"] = redactPhi(record["contexts"]);
  }
  if (record["tags"] !== undefined) {
    record["tags"] = redactPhi(record["tags"]);
  }
  if (record["exception"] !== undefined) {
    record["exception"] = redactPhi(record["exception"]);
  }
  if (record["spans"] !== undefined) {
    record["spans"] = redactPhi(record["spans"]);
  }
  if (record["attributes"] !== undefined) {
    record["attributes"] = redactPhi(record["attributes"]);
  }
  if (typeof record["transaction"] === "string") {
    record["transaction"] = redactString(record["transaction"]);
  }

  if (Array.isArray(record["breadcrumbs"])) {
    record["breadcrumbs"] = record["breadcrumbs"].map((crumb) => {
      if (!isRecord(crumb)) {
        return crumb;
      }
      if (typeof crumb["message"] === "string") {
        crumb["message"] = redactString(crumb["message"]);
      }
      if (crumb["data"] !== undefined) {
        crumb["data"] = redactPhi(crumb["data"]);
      }
      return crumb;
    });
  }

  if (typeof record["message"] === "string") {
    record["message"] = redactString(record["message"]);
  }
}

export function scrubSentryEventRecord<T>(event: T): T {
  if (!isRecord(event)) {
    return event;
  }

  scrubMutableSentryRecord(event);
  return event;
}
