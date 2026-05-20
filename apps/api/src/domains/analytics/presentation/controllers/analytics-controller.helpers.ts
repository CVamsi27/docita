export function parseAnalyticsDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}
