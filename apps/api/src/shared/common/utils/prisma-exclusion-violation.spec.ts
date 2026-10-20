import { Prisma } from '@workspace/db';
import { isPrismaExclusionViolation } from './prisma-exclusion-violation';

describe('isPrismaExclusionViolation', () => {
  const constraint = 'Appointment_no_active_overlap';

  it('detects a known-request error that names the constraint', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      `conflicting key value violates exclusion constraint "${constraint}"`,
      { code: 'P2010', clientVersion: 'test' },
    );
    expect(isPrismaExclusionViolation(err, constraint)).toBe(true);
  });

  it('detects an unknown-request error that names the constraint', () => {
    const err = new Prisma.PrismaClientUnknownRequestError(
      `conflicting key value violates exclusion constraint "${constraint}"`,
      { clientVersion: 'test' },
    );
    expect(isPrismaExclusionViolation(err, constraint)).toBe(true);
  });

  it('rejects errors for a different constraint name', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      'conflicting key value violates exclusion constraint "Other_constraint"',
      { code: 'P2010', clientVersion: 'test' },
    );
    expect(isPrismaExclusionViolation(err, constraint)).toBe(false);
  });

  it('rejects unique-constraint errors that happen to mention the table', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      `Unique constraint failed on the fields: (\`${constraint}\`)`,
      { code: 'P2002', clientVersion: 'test' },
    );
    expect(isPrismaExclusionViolation(err, constraint)).toBe(false);
  });

  it('rejects non-Prisma errors', () => {
    expect(isPrismaExclusionViolation(new Error('boom'), constraint)).toBe(
      false,
    );
    expect(isPrismaExclusionViolation(undefined, constraint)).toBe(false);
    expect(isPrismaExclusionViolation({ message: 'plain' }, constraint)).toBe(
      false,
    );
  });

  it('detects a driver-adapter error whose cause carries the exclusion SQLSTATE', () => {
    const err = Object.assign(
      new Error(
        `conflicting key value violates exclusion constraint "${constraint}"`,
      ),
      { cause: { code: '23P01' } },
    );
    expect(isPrismaExclusionViolation(err, constraint)).toBe(true);
  });

  it('rejects a driver-adapter exclusion raised for a different constraint', () => {
    const err = Object.assign(
      new Error(
        'conflicting key value violates exclusion constraint "Other_constraint"',
      ),
      { cause: { code: '23P01' } },
    );
    expect(isPrismaExclusionViolation(err, constraint)).toBe(false);
  });

  it('rejects a driver-adapter error with a different SQLSTATE', () => {
    const err = Object.assign(
      new Error(
        `duplicate key value violates unique constraint "${constraint}"`,
      ),
      { cause: { code: '23505' } },
    );
    expect(isPrismaExclusionViolation(err, constraint)).toBe(false);
  });
});
