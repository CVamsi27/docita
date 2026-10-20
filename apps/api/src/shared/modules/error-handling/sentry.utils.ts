import { HttpException } from '@nestjs/common';
import type { NodeOptions } from '@sentry/nestjs';
import {
  REDACTED,
  redactPhi,
  redactString,
} from '@/shared/modules/observability/phi-redactor';
import { redactMonitoringUrl } from '@workspace/utils';

export function shouldCaptureInSentry(error: unknown): boolean {
  if (error instanceof HttpException) return error.getStatus() >= 500;

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isZodValidationEvent(event: unknown): boolean {
  if (!isRecord(event)) {
    return false;
  }

  const exception = event.exception;
  if (!isRecord(exception)) {
    return false;
  }

  const values = exception.values;
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some((value) => {
    if (!isRecord(value)) {
      return false;
    }

    return value.type === 'ZodValidationException';
  });
}

function scrubMutableRecord(record: Record<string, unknown>): void {
  const request = record.request;
  if (isRecord(request)) {
    if (typeof request.url === 'string') {
      request.url = redactMonitoringUrl(request.url);
    }
    if (request.data !== undefined) {
      request.data = redactPhi(request.data);
    }
    if (request.query_string !== undefined) {
      request.query_string = REDACTED;
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
  if (record.exception !== undefined) {
    record.exception = redactPhi(record.exception);
  }
  if (record.spans !== undefined) {
    record.spans = redactPhi(record.spans);
  }
  if (record.attributes !== undefined) {
    record.attributes = redactPhi(record.attributes);
  }
  if (typeof record.transaction === 'string') {
    record.transaction = redactString(record.transaction);
  }

  if (Array.isArray(record.breadcrumbs)) {
    record.breadcrumbs = record.breadcrumbs.map((crumb) => {
      if (!isRecord(crumb)) {
        return crumb;
      }
      if (typeof crumb.message === 'string') {
        crumb.message = redactString(crumb.message);
      }
      if (crumb.data !== undefined) {
        crumb.data = redactPhi(crumb.data);
      }
      return crumb;
    });
  }

  if (typeof record.message === 'string') {
    record.message = redactString(record.message);
  }
}

function scrubSentryEvent<T>(event: T): T {
  if (!isRecord(event)) {
    return event;
  }

  scrubMutableRecord(event);
  return event;
}

export function createSentryBeforeSend(
  extraBeforeSend?: NonNullable<NodeOptions['beforeSend']>,
): NonNullable<NodeOptions['beforeSend']> {
  return (event, hint) => {
    if (
      !shouldCaptureInSentry(hint?.originalException) ||
      isZodValidationEvent(event)
    ) {
      return null;
    }

    const scrubbed = scrubSentryEvent(event);
    return extraBeforeSend ? extraBeforeSend(scrubbed, hint) : scrubbed;
  };
}

export function createSentryBeforeSendTransaction(
  extraBeforeSend?: NonNullable<NodeOptions['beforeSendTransaction']>,
): NonNullable<NodeOptions['beforeSendTransaction']> {
  return (event, hint) => {
    const scrubbed = scrubSentryEvent(event);
    return extraBeforeSend ? extraBeforeSend(scrubbed, hint) : scrubbed;
  };
}

export function createSentryBeforeSendLog(
  extraBeforeSend?: NonNullable<NodeOptions['beforeSendLog']>,
): NonNullable<NodeOptions['beforeSendLog']> {
  return (log) => {
    const scrubbed = scrubSentryEvent(log);
    return extraBeforeSend ? extraBeforeSend(scrubbed) : scrubbed;
  };
}
