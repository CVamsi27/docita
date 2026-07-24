import { BadRequestException } from '@nestjs/common';
import { FollowUpStatus } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';

export function parseFollowUpDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Follow-up date filter is invalid');
  }
  return date;
}

export function parseFollowUpStatuses(
  status?: string,
): FollowUpStatus[] | undefined {
  if (!status) return [FollowUpStatus.PENDING, FollowUpStatus.REMINDER_SENT];
  const statuses = status
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .map((item) => parseStringEnumMember(Object.values(FollowUpStatus), item))
    // parseStringEnumMember returns null (not undefined) for unknown values;
    // filter both so a bogus status can't leak into the `status: { in: [...] }`
    // query as null.
    .filter((item): item is FollowUpStatus => item != null);
  return statuses.length > 0 ? statuses : undefined;
}
