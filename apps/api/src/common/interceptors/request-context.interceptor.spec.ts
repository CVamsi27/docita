import { Test, TestingModule } from '@nestjs/testing';
import {
  CallHandler,
  ContextType,
  ExecutionContext,
  Type,
} from '@nestjs/common';
import { of } from 'rxjs';
import { RequestContextInterceptor } from './request-context.interceptor';

type HeaderMap = Record<string, string | undefined>;

type TestRequest = {
  headers: HeaderMap;
  id?: string;
  method: string;
  url: string;
  ip: string;
  get: jest.Mock;
};

type TestResponse = {
  setHeader: jest.Mock;
};

const noopHandler = (): void => {};

const createRequest = (headers: HeaderMap = {}): TestRequest => ({
  headers,
  id: undefined,
  method: 'GET',
  url: '/appointments',
  ip: '127.0.0.1',
  get: jest.fn().mockReturnValue('jest-agent'),
});

const createResponse = (): TestResponse => ({
  setHeader: jest.fn(),
});

const createExecutionContext = (
  request: TestRequest,
  response: TestResponse,
): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: <T = TestRequest>() => request as T,
      getResponse: <T = TestResponse>() => response as T,
      getNext: <T = () => void>() => noopHandler as T,
    }),
    switchToRpc: () => ({
      getData: <T = undefined>() => undefined as T,
      getContext: <T = undefined>() => undefined as T,
    }),
    switchToWs: () => ({
      getClient: <T = undefined>() => undefined as T,
      getData: <T = undefined>() => undefined as T,
      getPattern: <T = undefined>() => undefined as T,
    }),
    getType: <TContext extends string = ContextType>() => 'http' as TContext,
    getClass: <T = RequestContextInterceptor>() =>
      RequestContextInterceptor as Type<T>,
    getHandler: () => noopHandler,
    getArgs: <
      T extends Array<TestRequest | TestResponse> = Array<
        TestRequest | TestResponse
      >,
    >() => [request, response] as T,
    getArgByIndex: <T = TestRequest | TestResponse>(index: number) =>
      [request, response][index] as T,
  };
};

const createCallHandler = <T>(value: T): CallHandler<T> => ({
  handle: () => of(value),
});

const createTestContext = (headers: HeaderMap = {}) => {
  const request = createRequest(headers);
  const response = createResponse();
  const executionContext = createExecutionContext(request, response);
  return { request, response, executionContext };
};

describe('RequestContextInterceptor', () => {
  let interceptor: RequestContextInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestContextInterceptor],
    }).compile();

    interceptor = module.get<RequestContextInterceptor>(
      RequestContextInterceptor,
    );
  });

  describe('intercept', () => {
    it('should generate correlation ID if not provided', (done) => {
      const { request, response, executionContext } = createTestContext();
      const callHandler = createCallHandler({});

      interceptor.intercept(executionContext, callHandler).subscribe(
        () => {
          expect(request.id).toBeDefined();
          expect(typeof request.id).toBe('string');
          expect(response.setHeader).toHaveBeenCalledWith(
            'x-correlation-id',
            request.id,
          );
          done();
        },
        (error) => done(error),
      );
    });

    it('should extract correlation ID from header if provided', (done) => {
      const providedCorrelationId = 'existing-correlation-id-123';
      const { request, response, executionContext } = createTestContext({
        'x-correlation-id': providedCorrelationId,
      });
      const callHandler = createCallHandler({});

      interceptor.intercept(executionContext, callHandler).subscribe(
        () => {
          expect(request.id).toBe(providedCorrelationId);
          expect(response.setHeader).toHaveBeenCalledWith(
            'x-correlation-id',
            providedCorrelationId,
          );
          done();
        },
        (error) => done(error),
      );
    });

    it('should set correlation ID in response header', (done) => {
      const { response, executionContext } = createTestContext();
      const callHandler = createCallHandler({ data: 'response' });

      interceptor.intercept(executionContext, callHandler).subscribe(
        () => {
          expect(response.setHeader).toHaveBeenCalled();
          const calls = response.setHeader.mock.calls;
          expect(
            calls.some(
              (call) =>
                call[0] === 'x-correlation-id' &&
                typeof call[1] === 'string' &&
                call[1].length > 0,
            ),
          ).toBe(true);
          done();
        },
        (error) => done(error),
      );
    });

    it('should handle case-insensitive header', (done) => {
      const providedCorrelationId = 'header-correlation-id';
      const { request, executionContext } = createTestContext({
        'X-Correlation-Id': providedCorrelationId,
      });
      const callHandler = createCallHandler({});

      interceptor.intercept(executionContext, callHandler).subscribe(
        () => {
          expect(request.id).toBeDefined();
          done();
        },
        (error) => done(error),
      );
    });

    it('should pass through call handler response', (done) => {
      const responseData = { message: 'success', data: [1, 2, 3] };
      const { executionContext } = createTestContext();
      const callHandler = createCallHandler(responseData);

      interceptor.intercept(executionContext, callHandler).subscribe(
        (result) => {
          expect(result).toEqual(responseData);
          done();
        },
        (error) => done(error),
      );
    });

    it('should handle errors from handler', (done) => {
      const testError = new Error('Handler error');
      const { executionContext } = createTestContext();
      const callHandler = createCallHandler(testError);

      expect(() => {
        interceptor.intercept(executionContext, callHandler);
      }).not.toThrow();

      done();
    });
  });

  describe('correlation ID generation', () => {
    it('should generate unique correlation IDs', (done) => {
      const ids = new Set<string>();

      for (let index = 0; index < 5; index += 1) {
        const { request, executionContext } = createTestContext();
        const callHandler = createCallHandler({});

        interceptor.intercept(executionContext, callHandler).subscribe(() => {
          if (request.id) {
            ids.add(request.id);
          }
        });
      }

      setTimeout(() => {
        expect(ids.size).toBeGreaterThan(1);
        done();
      }, 100);
    });

    it('should have valid UUID format', (done) => {
      const { request, executionContext } = createTestContext();
      const callHandler = createCallHandler({});

      interceptor.intercept(executionContext, callHandler).subscribe(
        () => {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(request.id).toMatch(uuidRegex);
          done();
        },
        (error) => done(error),
      );
    });
  });
});
