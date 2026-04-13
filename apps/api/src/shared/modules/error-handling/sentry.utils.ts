import { HttpException } from '@nestjs/common';
import type { NodeOptions } from '@sentry/nestjs';

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

    return extraBeforeSend ? extraBeforeSend(event, hint) : event;
  };
}
