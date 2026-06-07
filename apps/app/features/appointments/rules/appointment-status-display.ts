export function getAppointmentStatusDisplay(status: string): string {
  const normalizedStatus = status?.replace(/-/g, "_").toUpperCase();

  switch (normalizedStatus) {
    case "SCHEDULED":
      return "Scheduled";
    case "CHECKED_IN":
      return "Checked In";
    case "IN_PROGRESS":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No Show";
    default:
      return "Unknown";
  }
}
