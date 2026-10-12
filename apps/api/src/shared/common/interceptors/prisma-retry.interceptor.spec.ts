import { defer, firstValueFrom, Observable, of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext, HttpException } from '@nestjs/common';
import { PrismaRetryInterceptor } from '@/shared/common/interceptors/prisma-retry.interceptor';

/**
 * The interceptor is registered globally (`APP_INTERCEPTOR` in `app.module.ts`),
 * so its terminal behaviour decides the status code every route returns when the
 * database is briefly unreachable.
 *
 * `handle()` must return a COLD observable, exactly as Nest does: `retryWhen`
 * resubscribes to the source rather than calling `handle()` again, so the body
 * runs once per attempt.
 */
describe('PrismaRetryInterceptor', () => {
  let interceptor: PrismaRetryInterceptor;
  const context = {} as ExecutionContext;

  const handlerFor = (onSubscribe: () => Observable<unknown>): CallHandler => ({
    handle: () => defer(onSubscribe),
  });

  /** Attaches both handlers up front so no rejection is left unhandled. */
  const settle = <T>(promise: Promise<T>) =>
    promise.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );

  beforeEach(() => {
    interceptor = new PrismaRetryInterceptor();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries a transient error and succeeds without surfacing it', async () => {
    const transient = new Error('timeout exceeded when trying to connect');
    let calls = 0;

    const outcome = settle(
      firstValueFrom(
        interceptor.intercept(
          context,
          handlerFor(() => {
            calls += 1;
            return calls < 3 ? throwError(() => transient) : of('ok');
          }),
        ),
      ),
    );
    await jest.runAllTimersAsync();

    const result = await outcome;
    expect(result).toEqual({ ok: true, value: 'ok' });
    expect(calls).toBe(3);
  });

  it('does not retry a non-transient error', async () => {
    const permanent = new Error('syntax error at or near "SELCT"');
    let calls = 0;

    const outcome = settle(
      firstValueFrom(
        interceptor.intercept(
          context,
          handlerFor(() => {
            calls += 1;
            return throwError(() => permanent);
          }),
        ),
      ),
    );
    await jest.runAllTimersAsync();

    const result = await outcome;
    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.error).toBe(permanent);
    expect(calls).toBe(1);
  });

  it('answers 503 once retries are exhausted instead of a raw 500', async () => {
    const transient = new Error('timeout exceeded when trying to connect');
    let calls = 0;

    const outcome = settle(
      firstValueFrom(
        interceptor.intercept(
          context,
          handlerFor(() => {
            calls += 1;
            return throwError(() => transient);
          }),
        ),
      ),
    );
    await jest.runAllTimersAsync();

    const result = await outcome;
    expect(result.ok).toBe(false);
    const error = result.ok ? undefined : result.error;
    expect(error).toBeInstanceOf(HttpException);
    const httpError = error as HttpException;
    expect(httpError.getStatus()).toBe(503);
    expect(calls).toBe(4); // initial attempt + 3 retries

    // The raw driver message must not reach the client body; it stays on the
    // cause chain so logs and Sentry keep it.
    expect(JSON.stringify(httpError.getResponse())).not.toContain(
      'timeout exceeded',
    );
    expect(httpError.cause).toBe(transient);
  });

  it('classifies the measured pool-exhaustion shape as transient', () => {
    const classify = (
      interceptor as unknown as {
        isTransientPrismaError(error: unknown): boolean;
      }
    ).isTransientPrismaError.bind(interceptor);

    // Shape captured from the real PrismaPg adapter under an exhausted pool:
    // a plain Error with no `code`, ownKeys [stack, message, clientVersion].
    expect(classify(new Error('timeout exceeded when trying to connect'))).toBe(
      true,
    );
    expect(classify(new Error('Connection acquired timeout'))).toBe(true);
    expect(classify(new Error('ECONNREFUSED'))).toBe(true);
    expect(classify(new Error('canceling statement due to user request'))).toBe(
      false,
    );
  });
});
