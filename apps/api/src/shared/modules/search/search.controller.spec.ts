import { ForbiddenException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SearchController } from './search.controller';

describe('SearchController', () => {
  const searchService = {
    search: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  let controller: SearchController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SearchController(searchService as never);
  });

  it('passes the clinic-scoped search request to the service', async () => {
    searchService.search.mockResolvedValue([]);

    await expect(
      controller.search(
        {
          user: {
            id: 'user-1',
            sub: 'user-1',
            name: 'Doctor One',
            clinicId: 'clinic-1',
            role: Role.DOCTOR,
            email: 'doctor@example.com',
          },
          headers: {},
          body: {},
          query: {},
          params: {},
        },
        'john',
        'patient,appointment',
        '10',
      ),
    ).resolves.toEqual([]);

    expect(searchService.search).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      query: 'john',
      types: ['patient', 'appointment'],
      limit: 10,
    });
  });

  it('rejects search requests without a clinic context', async () => {
    await expect(
      controller.search(
        {
          user: {
            id: 'user-1',
            sub: 'user-1',
            name: 'Internal User',
            clinicId: null,
            role: Role.INTERNAL,
            email: 'internal@example.com',
          },
          headers: {},
          body: {},
          query: {},
          params: {},
        },
        'john',
      ),
    ).rejects.toThrow(
      new ForbiddenException('Search requires a clinic context'),
    );
    expect(searchService.search).not.toHaveBeenCalled();
  });
});
