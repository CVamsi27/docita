import type { Reflector } from '@nestjs/core';

export function mockGetAllAndOverrideKeyBranch(
  mock: jest.MockedFunction<Reflector['getAllAndOverride']>,
  matchKey: unknown,
  whenMatched: unknown,
  whenNotMatched: unknown,
): void {
  mock.mockImplementation((key: unknown) =>
    key === matchKey ? whenMatched : whenNotMatched,
  );
}

export function mockGetAllAndOverrideKeyMap(
  mock: jest.MockedFunction<Reflector['getAllAndOverride']>,
  entries: ReadonlyArray<readonly [unknown, unknown]>,
): void {
  const map = new Map<unknown, unknown>(entries);
  mock.mockImplementation((key: unknown) => map.get(key));
}
