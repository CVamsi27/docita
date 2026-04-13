import { HttpException } from '@nestjs/common';
import type { NodeOptions } from '@sentry/nestjs';

export function shouldCaptureInSentry(error: unknown): boolean {
  if (error instanceof HttpException) {
    return error.getStatus() >= 500;
  }

  return true;
}

export function createSentryBeforeSend(
  extraBeforeSend?: NonNullable<NodeOptions['beforeSend']>,
): NonNullable<NodeOptions['beforeSend']> {
  return (event, hint) => {
    if (!shouldCaptureInSentry(hint?.originalException)) {
      return null;
    }

    return extraBeforeSend ? extraBeforeSend(event, hint) : event;
  };
}
