import { Prisma } from '@workspace/db';

/**
 * Prisma P2021: referenced table does not exist in the current database.
 * Typical when a migration has not been applied yet.
 */
export function isPrismaTableDoesNotExistError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021'
  );
}

/**
 * P2021 with a message fragment matching the missing relation/table
 * (e.g. `ClinicWeeklySchedule` in `public.ClinicWeeklySchedule`).
 */
export function isPrismaTableDoesNotExistForModel(
  error: unknown,
  modelNameInMessage: string,
): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    String(error.message).includes(modelNameInMessage)
  );
}
