import { Role } from '@workspace/db';
import {
  getDbRolesForTarget,
  getFeatureForTarget,
  requireFeatureForTarget,
} from './access-matrix.util';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@workspace/types', () => ({
  getAccessRoles: jest.fn(),
  getAccessFeature: jest.fn(),
}));

const mockedTypes = jest.mocked(
  jest.requireMock('@workspace/types') as {
    getAccessRoles: (...args: unknown[]) => string[];
    getAccessFeature: (...args: unknown[]) => string | undefined;
  },
);

describe('access-matrix.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps workspace role names to database roles and filters invalid values', () => {
    mockedTypes.getAccessRoles.mockReturnValue([
      'ADMIN',
      'NURSE',
      'DOCTOR',
      'UNKNOWN_ROLE',
    ]);

    const roles = getDbRolesForTarget('page.patients', 'read');

    expect(roles).toEqual([Role.ADMIN, Role.NURSE, Role.DOCTOR]);
    expect(mockedTypes.getAccessRoles).toHaveBeenCalledWith(
      'page.patients',
      'read',
    );
  });

  it('returns mapped feature for target', () => {
    mockedTypes.getAccessFeature.mockReturnValue('API_ACCESS');

    expect(getFeatureForTarget('page.invoices')).toBe('API_ACCESS');
  });

  it('throws when a required feature mapping is missing', () => {
    mockedTypes.getAccessFeature.mockReturnValue(undefined);

    expect(() => requireFeatureForTarget('page.invoices')).toThrow(
      'Missing feature mapping',
    );
  });
});
