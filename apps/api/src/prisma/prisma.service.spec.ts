import { describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from './prisma.service';

describe('PrismaService.onModuleInit', () => {
  it('applies extensions and starts database connect without blocking bootstrap', async () => {
    // Extension chain length must match prisma.service.ts:
    //   rls-routing → encryption → audit → tenant → slow-query → query-budget
    const extendedClient = { marker: 'extended' };
    const sixthLevel = {
      $extends: jest.fn(() => extendedClient) as jest.Mock,
    };
    const fifthLevel = {
      $extends: jest.fn(() => sixthLevel) as jest.Mock,
    };
    const fourthLevel = {
      $extends: jest.fn(() => fifthLevel) as jest.Mock,
    };
    const thirdLevel = {
      $extends: jest.fn(() => fourthLevel) as jest.Mock,
    };
    const secondLevel = {
      $extends: jest.fn(() => thirdLevel) as jest.Mock,
    };
    const mockThis = {
      $extends: jest.fn(() => secondLevel) as jest.Mock,
      $connect: jest.fn(async () => undefined) as jest.Mock,
      logger: {
        log: jest.fn(),
        error: jest.fn(),
      },
    } as Record<string, unknown> & {
      $extends: jest.Mock;
      $connect: jest.Mock;
      logger: { log: jest.Mock; error: jest.Mock };
    };

    const result = PrismaService.prototype.onModuleInit.call(mockThis);

    expect(result).toBeUndefined();
    expect(mockThis.$extends).toHaveBeenCalledTimes(1);
    expect(mockThis.$connect).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    expect(mockThis.logger.log).toHaveBeenCalledWith(
      'Primary database connection established',
    );
  });
});
