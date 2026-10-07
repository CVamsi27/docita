import { describe, expect, it } from '@jest/globals';
import { Prisma } from '@workspace/db';
import {
  isUniqueConstraintOn,
  uniqueConstraintTargets,
} from './unique-constraint';

const knownRequest = (code: string, meta?: unknown) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code,
    clientVersion: 'test',
    meta: meta as never,
  });

describe('uniqueConstraintTargets', () => {
  it('reads the classic meta.target column list', () => {
    expect(
      uniqueConstraintTargets(
        knownRequest('P2002', { target: ['clinicId', 'pendingSlotKey'] }),
      ),
    ).toEqual(['clinicId', 'pendingSlotKey']);
  });

  it('reads the driver-adapter constraint fields when meta.target is absent', () => {
    expect(
      uniqueConstraintTargets(
        knownRequest('P2002', {
          modelName: 'AppointmentRequest',
          driverAdapterError: {
            cause: {
              constraint: { fields: ['pendingSlotKey'] },
            },
          },
        }),
      ),
    ).toEqual(['pendingSlotKey']);
  });

  it('normalizes SQL-quoted field names from the driver adapter', () => {
    // Prisma 7 against Postgres reports camelCase unique columns with the
    // quoting used in the constraint definition; the match must still work or
    // a duplicate submit surfaces as a 500 instead of being re-routed.
    expect(
      uniqueConstraintTargets(
        knownRequest('P2002', { target: ['"pendingSlotKey"'] }),
      ),
    ).toEqual(['pendingSlotKey']);
    expect(
      uniqueConstraintTargets(
        knownRequest('P2002', {
          driverAdapterError: {
            cause: { constraint: { fields: ['"pendingSlotKey"'] } },
          },
        }),
      ),
    ).toEqual(['pendingSlotKey']);
    expect(
      isUniqueConstraintOn(
        knownRequest('P2002', { target: ['"pendingSlotKey"'] }),
        'pendingSlotKey',
      ),
    ).toBe(true);
  });

  it('ignores non-string target entries', () => {
    expect(
      uniqueConstraintTargets(
        knownRequest('P2002', { target: ['pendingSlotKey', 7, null] }),
      ),
    ).toEqual(['pendingSlotKey']);
  });

  it('returns no targets for other Prisma codes or shapes', () => {
    expect(
      uniqueConstraintTargets(knownRequest('P2003', { target: ['x'] })),
    ).toEqual([]);
    expect(uniqueConstraintTargets(knownRequest('P2002'))).toEqual([]);
    expect(
      uniqueConstraintTargets(
        knownRequest('P2002', { target: 'not-an-array' }),
      ),
    ).toEqual([]);
  });

  it('returns no targets for values that are not Prisma known-request errors', () => {
    expect(uniqueConstraintTargets(new Error('boom'))).toEqual([]);
    expect(uniqueConstraintTargets(null)).toEqual([]);
    expect(
      uniqueConstraintTargets({ code: 'P2002', meta: { target: ['x'] } }),
    ).toEqual([]);
  });
});

describe('isUniqueConstraintOn', () => {
  it('matches a named column and rejects other columns', () => {
    const error = knownRequest('P2002', { target: ['pendingSlotKey'] });
    expect(isUniqueConstraintOn(error, 'pendingSlotKey')).toBe(true);
    expect(isUniqueConstraintOn(error, 'fingerprint')).toBe(false);
  });
});
