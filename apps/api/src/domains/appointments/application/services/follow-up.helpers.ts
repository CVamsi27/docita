import { BadRequestException } from '@nestjs/common';
import { FollowUpStatus } from '@workspace/db';

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
    .filter((item): item is FollowUpStatus =>
      Object.values(FollowUpStatus).includes(item as FollowUpStatus),
    );
  return statuses.length > 0 ? statuses : undefined;
}
