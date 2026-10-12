import { logger } from "@/lib/monitoring/logger";
import { isPlatformOutageError, reportApiUnavailable } from "./api-availability";

export function handleApiClientError(error: unknown): never {
  logger.warn("API client error", { error });
  // Feed platform-level failures (502/503/504, network/timeout) to the
  // availability store so the app shell can show the warming screen while the
  // API recovers, including on public routes such as sign-in.
  if (isPlatformOutageError(error)) {
    reportApiUnavailable();
  }
  throw error;
}
