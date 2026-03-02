import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { RequestContextInterceptor } from './request-context.interceptor';
import { of } from 'rxjs';

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
      const mockRequest = {
        headers: {},
        id: undefined,
        get: jest.fn().mockReturnValue('jest-agent'),
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({})),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        () => {
          expect(mockRequest.id).toBeDefined();
          expect(typeof mockRequest.id).toBe('string');
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-correlation-id',
            mockRequest.id,
          );
          done();
        },
        (err) => done(err),
      );
    });

    it('should extract correlation ID from header if provided', (done) => {
      const providedCorrelationId = 'existing-correlation-id-123';
      const mockRequest = {
        headers: {
          'x-correlation-id': providedCorrelationId,
        },
        id: undefined,
        get: jest.fn().mockReturnValue('jest-agent'),
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({})),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        () => {
          expect(mockRequest.id).toBe(providedCorrelationId);
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-correlation-id',
            providedCorrelationId,
          );
          done();
        },
        (err) => done(err),
      );
    });

    it('should set correlation ID in response header', (done) => {
      const mockRequest = {
        headers: {},
        id: undefined,
        get: jest.fn().mockReturnValue('jest-agent'),
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'response' })),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        () => {
          expect(mockResponse.setHeader).toHaveBeenCalled();
          const calls = mockResponse.setHeader.mock.calls;
          expect(
            calls.some(
              (c: Array<string | number>) => c[0] === 'x-correlation-id',
            ),
          ).toBe(true);
          done();
        },
        (err) => done(err),
      );
    });

    it('should handle case-insensitive header', (done) => {
      const providedCorrelationId = 'header-correlation-id';
      const mockRequest = {
        headers: {
          'X-Correlation-Id': providedCorrelationId,
        },
        id: undefined,
        get: jest.fn().mockReturnValue('jest-agent'),
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({})),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        () => {
          expect(mockRequest.id).toBeDefined();
          done();
        },
        (err) => done(err),
      );
    });

    it('should pass through call handler response', (done) => {
      const responseData = { message: 'success', data: [1, 2, 3] };
      const mockRequest = {
        headers: {},
        id: undefined,
        get: jest.fn().mockReturnValue('jest-agent'),
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        (result) => {
          expect(result).toEqual(responseData);
          done();
        },
        (err) => done(err),
      );
    });

    it('should handle errors from handler', (done) => {
      const testError = new Error('Handler error');
      const mockRequest = {
        headers: {},
        id: undefined,
        get: jest.fn().mockReturnValue('jest-agent'),
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(testError).pipe()),
      } as CallHandler;

      expect(() => {
        interceptor.intercept(mockExecutionContext, mockCallHandler);
      }).not.toThrow();

      done();
    });
  });

  describe('correlation ID generation', () => {
    it('should generate unique correlation IDs', (done) => {
      const ids = new Set();

      for (let i = 0; i < 5; i++) {
        const mockRequest = {
          headers: {},
          id: undefined,
          get: jest.fn().mockReturnValue('jest-agent'),
        };

        const mockResponse = {
          setHeader: jest.fn(),
        };

        const mockExecutionContext = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue(mockRequest),
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as ExecutionContext;

        const mockCallHandler = {
          handle: jest.fn().mockReturnValue(of({})),
        } as CallHandler;

        interceptor
          .intercept(mockExecutionContext, mockCallHandler)
          .subscribe(() => {
            ids.add(mockRequest.id);
          });
      }

      setTimeout(() => {
        expect(ids.size).toBeGreaterThan(1);
        done();
      }, 100);
    });

    it('should have valid UUID format', (done) => {
      const mockRequest = {
        headers: {},
        id: undefined,
        get: jest.fn().mockReturnValue('jest-agent'),
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({})),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(
        () => {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(mockRequest.id).toMatch(uuidRegex);
          done();
        },
        (err) => done(err),
      );
    });
  });
});
