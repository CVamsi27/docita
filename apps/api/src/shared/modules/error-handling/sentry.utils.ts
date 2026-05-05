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

function isZodValidationEvent(event: unknown): boolean {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const exception = (event as { exception?: unknown }).exception;
  if (!exception || typeof exception !== 'object') {
    return false;
  }

  const values = (exception as { values?: unknown }).values;
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some((value) => {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return (value as { type?: unknown }).type === 'ZodValidationException';
  });
}

function scrubSentryEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') {
    return event;
  }
  const e = event as Record<string, unknown>;

  if (e.request && typeof e.request === 'object') {
    const req = e.request as Record<string, unknown>;
    if (req.data !== undefined) {
      req.data = redactPhi(req.data);
    }
    if (typeof req.query_string === 'string') {
      req.query_string = redactString(req.query_string);
    } else if (req.query_string !== undefined) {
      req.query_string = redactPhi(req.query_string);
    }
    if (req.headers !== undefined) {
      req.headers = redactPhi(req.headers);
    }
    if (req.cookies !== undefined) {
      req.cookies = redactPhi(req.cookies);
    }
  }

  if (e.extra !== undefined) {
    e.extra = redactPhi(e.extra) as Record<string, unknown>;
  }
  if (e.contexts !== undefined) {
    e.contexts = redactPhi(e.contexts) as Record<string, unknown>;
  }
  if (e.tags !== undefined) {
    e.tags = redactPhi(e.tags) as Record<string, string>;
  }

  if (Array.isArray(e.breadcrumbs)) {
    e.breadcrumbs = e.breadcrumbs.map((crumb: unknown) => {
      if (!crumb || typeof crumb !== 'object') {
        return crumb;
      }
      const c = crumb as Record<string, unknown>;
      if (typeof c.message === 'string') {
        c.message = redactString(c.message);
      }
      if (c.data !== undefined) {
        c.data = redactPhi(c.data);
      }
      return c;
    });
  }

  if (e.message !== undefined && typeof e.message === 'string') {
    e.message = redactString(e.message);
  }

  return e as T;
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
