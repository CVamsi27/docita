/** One-line summary for dashboard / today headers (appointments + queue). */
export function formatDashboardSummary(
  appointmentCount: number,
  waitingCount: number,
): string | undefined {
  if (appointmentCount === 0 && waitingCount === 0) return undefined;
  const parts: string[] = [];
  if (appointmentCount > 0) {
    parts.push(
      `${appointmentCount} appointment${appointmentCount !== 1 ? "s" : ""} today`,
    );
  }
  if (waitingCount > 0) {
    parts.push(`${waitingCount} waiting`);
  }
  return parts.join(" · ");
}
