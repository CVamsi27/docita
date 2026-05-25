import { HttpException } from '@nestjs/common';
import type { NodeOptions } from '@sentry/nestjs';
import {
  redactPhi,
  redactString,
} from '@/shared/modules/observability/phi-redactor';

export function shouldCaptureInSentry(error: unknown): boolean {
  if (error instanceof HttpException) {
    return error.getStatus() >= 500;
  }

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
    if (request.data !== undefined) {
      request.data = redactPhi(request.data);
    }
    if (typeof request.query_string === 'string') {
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

export { scrubSentryEvent };

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
