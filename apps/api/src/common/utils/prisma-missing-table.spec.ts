import { Prisma } from '@workspace/db';
import {
  isPrismaTableDoesNotExistError,
  isPrismaTableDoesNotExistForModel,
} from './prisma-missing-table';

describe('prisma-missing-table', () => {
  it('detects P2021', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      'The table `public.Foo` does not exist in the current database.',
      { code: 'P2021', clientVersion: 'test' },
    );
    expect(isPrismaTableDoesNotExistError(err)).toBe(true);
    expect(isPrismaTableDoesNotExistForModel(err, 'Foo')).toBe(true);
    expect(isPrismaTableDoesNotExistForModel(err, 'Bar')).toBe(false);
  });

  it('rejects non-P2021 Prisma errors', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    expect(isPrismaTableDoesNotExistError(err)).toBe(false);
    expect(isPrismaTableDoesNotExistForModel(err, 'Foo')).toBe(false);
  });

  it('rejects arbitrary errors', () => {
    expect(isPrismaTableDoesNotExistError(new Error('nope'))).toBe(false);
    expect(isPrismaTableDoesNotExistForModel(new Error('nope'), 'Foo')).toBe(
      false,
    );
  });
});
