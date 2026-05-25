import type { Reflector } from '@nestjs/core';

export type MockedReflectorGetAllAndOverride = jest.Mocked<
  Pick<Reflector, 'getAllAndOverride'>
>['getAllAndOverride'];

export function mockGetAllAndOverrideKeyBranch(
  mock: MockedReflectorGetAllAndOverride,
  matchKey: unknown,
  whenMatched: unknown,
  whenNotMatched: unknown,
): void {
  mock.mockImplementation((key: unknown) =>
    key === matchKey ? whenMatched : whenNotMatched,
  );
}

export function mockGetAllAndOverrideKeyMap(
  mock: MockedReflectorGetAllAndOverride,
  entries: ReadonlyArray<readonly [unknown, unknown]>,
): void {
  const map = new Map<unknown, unknown>(entries);
  mock.mockImplementation((key: unknown) => map.get(key));
}

/** Prefer keyed maps over ordering-sensitive `mockReturnValueOnce` on `getAllAndOverride`. */
export function createKeyedReflectorMock(
  entries: ReadonlyArray<readonly [unknown, unknown]>,
): MockedReflectorGetAllAndOverride {
  const mock: MockedReflectorGetAllAndOverride = jest.fn();
  mockGetAllAndOverrideKeyMap(mock, entries);
  return mock;
}
