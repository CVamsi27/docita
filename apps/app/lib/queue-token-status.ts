/**
 * Queue tokens use Prisma enum strings (WAITING, IN_PROGRESS, COMPLETED).
 * Some paths may emit kebab-case; normalize before comparing.
 */
export function normalizeQueueTokenStatusKey(status: string): string {
  return status.trim().toUpperCase().replace(/-/g, "_");
}

export function isQueueTokenWaiting(status: string): boolean {
  return normalizeQueueTokenStatusKey(status) === "WAITING";
}

export function isQueueTokenInProgress(status: string): boolean {
  return normalizeQueueTokenStatusKey(status) === "IN_PROGRESS";
}

export function isQueueTokenCompleted(status: string): boolean {
  return normalizeQueueTokenStatusKey(status) === "COMPLETED";
}
