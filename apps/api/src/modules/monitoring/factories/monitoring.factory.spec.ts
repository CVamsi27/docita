import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringFactory } from './monitoring.factory';
import { ZodError } from 'zod';

describe('MonitoringFactory', () => {
  let factory: MonitoringFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringFactory],
    }).compile();

    factory = module.get<MonitoringFactory>(MonitoringFactory);
  });

  describe('createApiRequest', () => {
    it('should validate and return api request data', () => {
      const data = {
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 50,
      };

      const result = factory.createApiRequest(data);

      expect(result).toEqual(expect.objectContaining(data));
    });

    it('should throw error for invalid data', () => {
      const data = {
        method: '', // Invalid
        path: '/api/test',
      };

      expect(() => factory.createApiRequest(data as any)).toThrow(ZodError);
    });
  });

  describe('createErrorLog', () => {
    it('should validate and return error log data with defaults', () => {
      const data = {
        type: 'Error',
        message: 'Something went wrong',
      };

      const result = factory.createErrorLog(data);

      expect(result).toEqual(
        expect.objectContaining({
          ...data,
          severity: 'ERROR',
        }),
      );
    });

    it('should throw error for invalid data', () => {
      const data = {
        message: '', // Invalid
      };

      expect(() => factory.createErrorLog(data as any)).toThrow(ZodError);
    });
  });
});
