/**
 * Shared Prisma `user` where fragments.
 *
 * Single home for the "counted users" rule so usage metering (billing) and
 * overage meters (subscriptions) cannot drift: on FRONT_DESK plans, doctors
 * with app login disabled are surfaced but do not consume a counted seat, so
 * they are excluded from the count; on every other plan mode all users count.
 */
import type { Prisma } from '@workspace/db';

export function activeUsersWhereFilter(
  clinicId: string,
  planMode?: string | null,
): Prisma.UserWhereInput {
  return {
    clinicId,
    ...(planMode === 'FRONT_DESK'
      ? {
          NOT: {
            AND: [{ role: 'DOCTOR' }, { appLoginDisabled: true }],
          },
        }
      : {}),
  };
}
