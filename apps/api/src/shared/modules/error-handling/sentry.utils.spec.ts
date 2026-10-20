import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { createSentryBeforeSend, shouldCaptureInSentry } from './sentry.utils';

describe('sentry.utils', () => {
  it('scrubs signed request and breadcrumb URLs before delivery', () => {
    const beforeSend = createSentryBeforeSend();
    const canary = 'synthetic-capability-canary';
    const event: Parameters<typeof beforeSend>[0] = {
      type: undefined,
      request: {
        url: `https://api.docita.work/api/v1/doctors/signature/upload/${canary}?signature=${canary}`,
        query_string: `token=${canary}`,
      },
      breadcrumbs: [{ data: { url: `/reset-password?token=${canary}` } }],
      exception: {
        values: [
          { type: 'Error', value: `Failed /upload-signature/${canary}` },
        ],
      },
    };
    const output = beforeSend(event, {
      originalException: new Error('failure'),
    });
    expect(JSON.stringify(output)).not.toContain(canary);
    expect(event.request?.url).toBe(
      'https://api.docita.work/api/v1/doctors/signature/upload/[REDACTED]',
    );
  });

  it('skips handled client errors', () => {
    expect(shouldCaptureInSentry(new BadRequestException('bad request'))).toBe(
      false,
    );
    expect(
      shouldCaptureInSentry(
        new BadRequestException('refresh_token is required'),
      ),
    ).toBe(false);
  });

  it('allows server errors and non-http errors', () => {
    expect(
      shouldCaptureInSentry(new InternalServerErrorException('boom')),
    ).toBe(true);
    expect(shouldCaptureInSentry(new Error('boom'))).toBe(true);
  });

  it('drops handled client errors in beforeSend', () => {
    const beforeSend = createSentryBeforeSend();
    type BeforeSend = typeof beforeSend;
    type BeforeSendEvent = Parameters<BeforeSend>[0];
    type BeforeSendHint = Parameters<BeforeSend>[1];

    const event = { event_id: 'event-1' } as BeforeSendEvent;
    const badRequestHint = {
      originalException: new BadRequestException('refresh_token is required'),
    } as BeforeSendHint;
    const serverErrorHint = {
      originalException: new InternalServerErrorException('boom'),
    } as BeforeSendHint;

    expect(beforeSend(event, badRequestHint)).toBeNull();
    expect(beforeSend(event, serverErrorHint)).toBe(event);
  });

  it('drops zod validation events even when the original exception is unavailable', () => {
    const beforeSend = createSentryBeforeSend();
    type BeforeSend = typeof beforeSend;
    type BeforeSendEvent = Parameters<BeforeSend>[0];
    type BeforeSendHint = Parameters<BeforeSend>[1];

    const event = {
      exception: {
        values: [
          {
            type: 'ZodValidationException',
            value: 'Validation failed',
          },
        ],
      },
    } as BeforeSendEvent;
    const emptyHint = {} as BeforeSendHint;

    expect(beforeSend(event, emptyHint)).toBeNull();
  });

  it('respects caller-provided beforeSend logic after filtering', () => {
    type ExtraBeforeSend = NonNullable<
      Parameters<typeof createSentryBeforeSend>[0]
    >;

    const extraBeforeSend = jest.fn<ExtraBeforeSend>((event) => event);
    const beforeSend = createSentryBeforeSend(extraBeforeSend);
    type BeforeSend = typeof beforeSend;
    type BeforeSendEvent = Parameters<BeforeSend>[0];
    type BeforeSendHint = Parameters<BeforeSend>[1];

    const event = { event_id: 'event-2' } as BeforeSendEvent;
    const serverErrorHint = {
      originalException: new InternalServerErrorException('boom'),
    } as BeforeSendHint;

    expect(beforeSend(event, serverErrorHint)).toBe(event);
    expect(extraBeforeSend.mock.calls[0]).toEqual([event, serverErrorHint]);
  });
});
