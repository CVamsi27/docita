import { Injectable, Logger } from '@nestjs/common';

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
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeoutMs ?? 10_000,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = (await response.json()) as T;
      return { ok: response.ok, status: response.status, json };
    } catch (error) {
      this.logger.warn(
        `Doctor verification HTTP request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
