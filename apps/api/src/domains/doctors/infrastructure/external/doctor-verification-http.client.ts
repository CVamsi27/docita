import { Injectable, Logger } from '@nestjs/common';
import { assertTypedJsonValue } from '@/shared/common/json/parse-serialized-json.boundary';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

type DoctorVerificationHttpResult<T> = {
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
      const json = assertTypedJsonValue<T>(await response.json());
      return { ok: response.ok, status: response.status, json };
    } catch (error) {
      this.logger.warn(
        `Doctor verification HTTP request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }
}
