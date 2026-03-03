import { createAPIClient } from "@/lib/client-factory";
import type { APIClient, APIClientConfig } from "@/lib/types";

let defaultClient: APIClient | null = null;

export function getAPIClient(config?: APIClientConfig): APIClient {
  if (config) {
    defaultClient = createAPIClient(config);
  }

  if (!defaultClient) {
    throw new Error(
      "API client not initialized. Call getAPIClient(config) first.",
    );
  }

  return defaultClient;
}
