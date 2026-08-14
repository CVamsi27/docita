import { logger } from "@/lib/monitoring/logger";

export function handleApiClientError(error: unknown): never {
  logger.warn("API client error", { error });
  throw error;
}