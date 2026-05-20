import { Injectable, Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

export type DoctorVerificationHttpResult<T> = {
  ok: boolean;
  status: number;
  json: T;
};

@Injectable()
export class DoctorVerificationHttpClient {
  private readonly logger = new Logger(DoctorVerificationHttpClient.name);

  async postJson<T>(
    url: string,
    body: unknown,
    options?: {
      headers?: Record<string, string>;
      timeoutMs?: number;
    },
  ): Promise<DoctorVerificationHttpResult<T>> {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(body),
        },
        options?.timeoutMs,
      );
      const json = (await response.json()) as T;
      return { ok: response.ok, status: response.status, json };
    } catch (error) {
      this.logger.warn(
        `Doctor verification HTTP request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }
}
